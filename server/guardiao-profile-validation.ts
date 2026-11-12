/** Normalização do nome público: não permite controles ou nomes vazios. */
export function normalizeGuardiaoDisplayName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim();
  if (name.length < 2 || name.length > 120 || /[\u0000-\u001F\u007F]/u.test(name)) return null;
  return name;
}
