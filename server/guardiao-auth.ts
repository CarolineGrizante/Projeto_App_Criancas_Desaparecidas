/**
 * Autenticação local do Guardião, independente do OAuth Manus.
 * Somente desenvolvimento acadêmico local; requer HTTPS e revisão de segurança antes de publicar.
 */
import { createHash, randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { guardiaoAccounts, guardiaoSessions } from "../drizzle/schema";
import { getDb } from "./db";
import { hashGuardiaoPassword, verifyGuardiaoPassword } from "./guardiao-password";
import { toPublicGuardiaoAccount } from "./guardiao-public-account";
import { normalizeGuardiaoDisplayName } from "./guardiao-profile-validation";

const COOKIE_NAME = "guardiao_local_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const attempts = new Map<string, { count: number; expires: number }>();

type Body = { name?: unknown; email?: unknown; password?: unknown };

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const fragment of raw.split(";")) {
    const [key, ...rest] = fragment.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function requestToken(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return readCookie(req, COOKIE_NAME);
}

function cookieOptions(req: Request) {
  // Para uso local em HTTP. Em produção, exigir HTTPS e proxy seguro configurado.
  const secure = req.secure;
  return { httpOnly: true, secure, sameSite: "strict" as const, path: "/" };
}

async function authenticated(req: Request) {
  const token = requestToken(req);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const records = await db.select({
    id: guardiaoAccounts.id,
    name: guardiaoAccounts.name,
    email: guardiaoAccounts.email,
    emailVerifiedAt: guardiaoAccounts.emailVerifiedAt,
    createdAt: guardiaoAccounts.createdAt,
    updatedAt: guardiaoAccounts.updatedAt,
    // Datas civis conforme a sessão do MySQL, sem deslocamento ao fuso do celular.
    createdDate: sql<string>`DATE_FORMAT(${guardiaoAccounts.createdAt}, '%Y-%m-%d')`,
    updatedDate: sql<string>`DATE_FORMAT(${guardiaoAccounts.updatedAt}, '%Y-%m-%d')`,
  }).from(guardiaoSessions)
    .innerJoin(guardiaoAccounts, eq(guardiaoSessions.accountId, guardiaoAccounts.id))
    .where(and(
      eq(guardiaoSessions.tokenHash, tokenDigest(token)),
      gt(guardiaoSessions.expiresAt, new Date()),
      isNull(guardiaoSessions.revokedAt),
    )).limit(1);
  return records[0] ?? null;
}

export async function authenticateGuardiaoRequest(req: Request) {
  return authenticated(req);
}

function checkRateLimit(key: string, max: number, windowMs: number, increment = true): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (attempts.size > 10000) {
    for (const [k, v] of attempts) if (v.expires <= now) attempts.delete(k);
    if (attempts.size > 10000) attempts.clear();
  }
  if (!current || current.expires <= now) {
    if (increment) attempts.set(key, { count: 1, expires: now + windowMs });
    return false;
  }
  if (increment) current.count += 1;
  return current.count >= max;
}

function errorResponse(res: Response, error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "ER_DUP_ENTRY") {
    res.status(409).json({ error: "Este e-mail já possui uma conta." });
    return;
  }
  // Não expor detalhes de MySQL ou segredos internos ao cliente.
  console.error("[Guardiao Auth] Erro interno:", error instanceof Error ? error.name : "desconhecido");
  res.status(503).json({ error: "Serviço de autenticação indisponível no momento." });
}

export function registerGuardiaoAuthRoutes(app: Express) {
  app.post("/api/guardiao-auth/register", async (req: Request, res: Response) => {
    const body: Body = req.body ?? {};
    if (checkRateLimit(`register:${req.ip}`, 6, 60 * 60 * 1000)) {
      res.status(429).json({ error: "Muitas tentativas. Tente mais tarde." });
      return;
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    if (name.length < 2 || name.length > 120 || !validEmail(email) ||
      typeof password !== "string" || password.length < 12 || password.length > 128) {
      res.status(400).json({ error: "Informe nome, e-mail válido e senha de 12 a 128 caracteres." });
      return;
    }
    try {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      const exists = await db.select({ id: guardiaoAccounts.id }).from(guardiaoAccounts)
        .where(eq(guardiaoAccounts.email, email)).limit(1);
      if (exists.length) {
        res.status(409).json({ error: "Este e-mail já possui uma conta." });
        return;
      }
      const passwordHash = await hashGuardiaoPassword(password);
      await db.insert(guardiaoAccounts).values({ name, email, passwordHash });
      res.status(201).json({ success: true, message: "Conta criada. O e-mail ainda NÃO foi verificado." });
    } catch (error) { errorResponse(res, error); }
  });

  app.post("/api/guardiao-auth/login", async (req: Request, res: Response) => {
    const body: Body = req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    if (!validEmail(email) || typeof password !== "string") {
      res.status(400).json({ error: "Informe um e-mail e uma senha válidos." });
      return;
    }
    const attemptKey = `login:${req.ip}:${email}`;
    if (checkRateLimit(attemptKey, 10, 15 * 60 * 1000, false)) {
      res.status(429).json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." });
      return;
    }
    try {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      const records = await db.select().from(guardiaoAccounts).where(eq(guardiaoAccounts.email, email)).limit(1);
      const account = records[0];
      // Gasta trabalho semelhante mesmo quando não há conta, para reduzir enumeração por tempo.
      const dummy = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);
      const matches = await verifyGuardiaoPassword(password, account?.passwordHash ?? dummy);
      if (!account || !matches) {
        checkRateLimit(attemptKey, 10, 15 * 60 * 1000);
        res.status(401).json({ error: "E-mail ou senha incorretos." });
        return;
      }
      attempts.delete(attemptKey);
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await db.insert(guardiaoSessions).values({ accountId: account.id, tokenHash: tokenDigest(token), expiresAt });
      res.cookie(COOKIE_NAME, token, { ...cookieOptions(req), maxAge: SESSION_TTL_MS });
      // Um navegador usa apenas cookie HttpOnly; o Expo Go recebe token via JSON.
      const native = req.header("X-Guardiao-Platform") === "native" && !req.headers.origin;
      res.json({
        success: true,
        account: toPublicGuardiaoAccount(account),
        ...(native ? { token } : {}),
      });
    } catch (error) { errorResponse(res, error); }
  });

  app.get("/api/guardiao-auth/me", async (req: Request, res: Response) => {
    try {
      const account = await authenticated(req);
      if (!account) {
        res.status(401).json({ error: "Sessão inválida ou expirada." });
        return;
      }
      res.json({ account: toPublicGuardiaoAccount(account) });
    } catch (error) { errorResponse(res, error); }
  });

  app.patch("/api/guardiao-auth/profile", async (req: Request, res: Response) => {
    try {
      const account = await authenticated(req);
      if (!account) {
        res.status(401).json({ error: "Sessão inválida ou expirada." });
        return;
      }
      const name = normalizeGuardiaoDisplayName(req.body?.name);
      if (!name) {
        res.status(400).json({ error: "O nome deve conter de 2 a 120 caracteres, sem quebras de linha." });
        return;
      }
      if (checkRateLimit(`profile:${account.id}`, 30, 60 * 60 * 1000)) {
        res.status(429).json({ error: "Muitas alterações. Tente novamente mais tarde." });
        return;
      }
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      if (name !== account.name) {
        await db.update(guardiaoAccounts).set({ name }).where(eq(guardiaoAccounts.id, account.id));
      }
      // Reconsulta a sessão e retorna somente o contrato público da conta.
      const updated = await authenticated(req);
      if (!updated) {
        res.status(401).json({ error: "Sessão inválida ou expirada." });
        return;
      }
      res.json({ account: toPublicGuardiaoAccount(updated) });
    } catch (error) { errorResponse(res, error); }
  });

  app.post("/api/guardiao-auth/logout", async (req: Request, res: Response) => {
    try {
      const token = requestToken(req);
      if (token && /^[0-9a-f]{64}$/.test(token)) {
        const db = await getDb();
        if (!db) throw new Error("Banco indisponível");
        await db.update(guardiaoSessions)
          .set({ revokedAt: new Date() })
          .where(eq(guardiaoSessions.tokenHash, tokenDigest(token)));
      }
      res.clearCookie(COOKIE_NAME, cookieOptions(req));
      res.json({ success: true });
    } catch (error) { errorResponse(res, error); }
  });
}
