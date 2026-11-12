/** Data civil YYYY-MM-DD recebida do MySQL, sem reconversão de fuso horário no Android. */
export function formatGuardiaoProfileDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Data indisponível";
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  if (Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return "Data indisponível";
  }
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).padStart(4, "0")}`;
}
