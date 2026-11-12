import { describe, expect, it } from "vitest";
import { normalizeGuardiaoEmail, validateGuardiaoPasswordChange } from "../server/guardiao-account-security";

describe("Segurança da conta Guardião", () => {
  it("normaliza e valida o e-mail sem marcá-lo como verificado", () => {
    expect(normalizeGuardiaoEmail(" NOVO.Exemplo@Example.COM ")).toBe("novo.exemplo@example.com");
    expect(normalizeGuardiaoEmail("sem-arroba")).toBeNull();
    expect(normalizeGuardiaoEmail("a@b")).toBeNull();
    expect(normalizeGuardiaoEmail("a@b.com\nX")).toBeNull();
    expect(normalizeGuardiaoEmail("a".repeat(310) + "@example.com")).toBeNull();
  });
  it("rejeita senhas curtas, repetidas e senha atual ausente", () => {
    expect(validateGuardiaoPasswordChange("", "SenhaLonga1234!")).toMatch(/atual/);
    expect(validateGuardiaoPasswordChange("SenhaAtual123!", "curta")).toMatch(/12/);
    expect(validateGuardiaoPasswordChange("SenhaAtual123!", "SenhaAtual123!")).toMatch(/diferente/);
    expect(validateGuardiaoPasswordChange("SenhaAtual123!", "SenhaNova456!" )).toBeNull();
  });
});
