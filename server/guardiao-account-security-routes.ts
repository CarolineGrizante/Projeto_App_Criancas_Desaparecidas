/** Alteração autenticada de senha/e-mail. Uso acadêmico em rede local; requer HTTPS para produção. */
import type { Express, Request, Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { guardiaoAccounts, guardiaoSessions } from "../drizzle/schema";
import { getDb } from "./db";
import { authenticateGuardiaoRequest } from "./guardiao-auth";
import { hashGuardiaoPassword, verifyGuardiaoPassword } from "./guardiao-password";
import { normalizeGuardiaoEmail, validateGuardiaoPasswordChange } from "./guardiao-account-security";

class WrongCurrentPasswordError extends Error {}
class ExistingEmailError extends Error {}
class SameEmailError extends Error {}

// Limitação de tentativas em memória, adequada apenas ao servidor local de desenvolvimento.
const attempts = new Map<number, { count: number; until: number }>();
function tooManyAttempts(id: number): boolean {
  const now = Date.now();
  if (attempts.size > 10000) {
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  }
  const previous = attempts.get(id);
  const count = previous && previous.until > now ? previous.count + 1 : 1;
  attempts.set(id, { count, until: previous && previous.until > now ? previous.until : now + 15 * 60_000 });
  return count > 6;
}

function fail(res: Response, error: unknown) {
  if (error instanceof WrongCurrentPasswordError) {
    res.status(401).json({ error: "Palavra-passe atual incorreta." });
    return;
  }
  if (error instanceof ExistingEmailError || (error as { code?: string })?.code === "ER_DUP_ENTRY") {
    res.status(409).json({ error: "Este e-mail já pertence a outra conta." });
    return;
  }
  if (error instanceof SameEmailError) {
    res.status(400).json({ error: "O novo e-mail deve ser diferente do atual." });
    return;
  }
  console.error("[Guardiao Security] Falha:", error instanceof Error ? error.name : "desconhecida");
  res.status(503).json({ error: "Não foi possível atualizar a conta. Tente novamente." });
}

function clearSessionCookie(req: Request, res: Response) {
  res.clearCookie("guardiao_local_session", {
    httpOnly: true,
    secure: req.secure,
    sameSite: "strict",
    path: "/",
  });
}

export function registerGuardiaoAccountSecurityRoutes(app: Express) {
  app.post("/api/guardiao-auth/change-password", async (req: Request, res: Response) => {
    try {
      const account = await authenticateGuardiaoRequest(req);
      if (!account) { res.status(401).json({ error: "Sessão inválida ou expirada." }); return; }
      if (tooManyAttempts(account.id)) { res.status(429).json({ error: "Muitas tentativas. Tente novamente mais tarde." }); return; }
      const currentPassword = req.body?.currentPassword;
      const newPassword = req.body?.newPassword;
      const validationError = validateGuardiaoPasswordChange(currentPassword, newPassword);
      if (validationError) { res.status(400).json({ error: validationError }); return; }
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      await db.transaction(async (tx) => {
        const rows = await tx.select({ passwordHash: guardiaoAccounts.passwordHash })
          .from(guardiaoAccounts).where(eq(guardiaoAccounts.id, account.id)).limit(1).for("update");
        if (!rows[0] || !(await verifyGuardiaoPassword(currentPassword, rows[0].passwordHash))) {
          throw new WrongCurrentPasswordError();
        }
        const passwordHash = await hashGuardiaoPassword(newPassword);
        await tx.update(guardiaoAccounts).set({ passwordHash }).where(eq(guardiaoAccounts.id, account.id));
        await tx.update(guardiaoSessions).set({ revokedAt: new Date() })
          .where(and(eq(guardiaoSessions.accountId, account.id), isNull(guardiaoSessions.revokedAt)));
      });
      attempts.delete(account.id);
      clearSessionCookie(req, res);
      res.json({ success: true, requiresLogin: true, message: "Palavra-passe alterada. Entre novamente." });
    } catch (error) { fail(res, error); }
  });

  app.post("/api/guardiao-auth/change-email", async (req: Request, res: Response) => {
    try {
      const account = await authenticateGuardiaoRequest(req);
      if (!account) { res.status(401).json({ error: "Sessão inválida ou expirada." }); return; }
      if (tooManyAttempts(account.id)) { res.status(429).json({ error: "Muitas tentativas. Tente novamente mais tarde." }); return; }
      const newEmail = normalizeGuardiaoEmail(req.body?.newEmail);
      const currentPassword = req.body?.currentPassword;
      if (!newEmail) { res.status(400).json({ error: "Informe um e-mail válido." }); return; }
      if (typeof currentPassword !== "string" || !currentPassword || currentPassword.length > 128) {
        res.status(400).json({ error: "Informe a palavra-passe atual." }); return;
      }
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      await db.transaction(async (tx) => {
        const rows = await tx.select({ passwordHash: guardiaoAccounts.passwordHash, email: guardiaoAccounts.email })
          .from(guardiaoAccounts).where(eq(guardiaoAccounts.id, account.id)).limit(1).for("update");
        if (!rows[0] || !(await verifyGuardiaoPassword(currentPassword, rows[0].passwordHash))) {
          throw new WrongCurrentPasswordError();
        }
        if (rows[0].email === newEmail) throw new SameEmailError();
        const other = await tx.select({ id: guardiaoAccounts.id }).from(guardiaoAccounts)
          .where(eq(guardiaoAccounts.email, newEmail)).limit(1);
        if (other.length) throw new ExistingEmailError();
        await tx.update(guardiaoAccounts).set({ email: newEmail, emailVerifiedAt: null })
          .where(eq(guardiaoAccounts.id, account.id));
        await tx.update(guardiaoSessions).set({ revokedAt: new Date() })
          .where(and(eq(guardiaoSessions.accountId, account.id), isNull(guardiaoSessions.revokedAt)));
      });
      attempts.delete(account.id);
      clearSessionCookie(req, res);
      res.json({ success: true, requiresLogin: true, message: "E-mail alterado, ainda não verificado. Entre novamente com o novo e-mail." });
    } catch (error) { fail(res, error); }
  });
}
