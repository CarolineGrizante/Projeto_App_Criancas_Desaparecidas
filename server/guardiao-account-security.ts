/** Regras de segurança para a conta local, sem dependência de OAuth. */
export function normalizeGuardiaoEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function validateGuardiaoPasswordChange(current: unknown, next: unknown): string | null {
  if (typeof current !== "string" || !current || current.length > 128) {
    return "Informe a palavra-passe atual.";
  }
  if (typeof next !== "string" || next.length < 12 || next.length > 128) {
    return "A nova palavra-passe deve ter entre 12 e 128 caracteres.";
  }
  if (current === next) return "A nova palavra-passe deve ser diferente da atual.";
  return null;
}
