import { describe, expect, it } from "vitest";
import { toPublicGuardiaoAccount } from "../server/guardiao-public-account";
import { normalizeGuardiaoDisplayName } from "../server/guardiao-profile-validation";
import { formatGuardiaoProfileDate } from "../lib/guardiao-profile-date";

describe("Contrato público do perfil", () => {
  const createdAt = new Date("2026-11-11T12:00:00.000Z");
  const updatedAt = new Date("2026-11-11T13:00:00.000Z");
  const account = {
    id: 7,
    name: "Usuário Teste",
    email: "teste@example.com",
    passwordHash: "NAO_EXPOR_HASH",
    emailVerifiedAt: null,
    createdAt,
    updatedAt,
    createdDate: "2026-11-11",
    updatedDate: "2026-11-11",
  };

  it("devolve apenas os campos permitidos e mantém e-mail não verificado", () => {
    const publicAccount = toPublicGuardiaoAccount(account);
    expect(publicAccount).toEqual({
      id: 7,
      name: "Usuário Teste",
      email: "teste@example.com",
      emailVerified: false,
      createdAt: "2026-11-11T12:00:00.000Z",
      updatedAt: "2026-11-11T13:00:00.000Z",
      createdDate: "2026-11-11",
      updatedDate: "2026-11-11",
    });
    expect(JSON.stringify(publicAccount)).not.toContain("NAO_EXPOR_HASH");
    expect(JSON.stringify(publicAccount)).not.toContain("passwordHash");
  });

  it("exibe verificado somente quando há data real de confirmação", () => {
    expect(toPublicGuardiaoAccount({ ...account, emailVerifiedAt: new Date() }).emailVerified).toBe(true);
  });
});


describe("Edição do perfil e datas civis", () => {
  it("aceita nomes válidos, remove espaços nas pontas e rejeita entradas inválidas", () => {
    expect(normalizeGuardiaoDisplayName("  Guardião Teste  ")).toBe("Guardião Teste");
    expect(normalizeGuardiaoDisplayName("A")).toBeNull();
    expect(normalizeGuardiaoDisplayName("Nome\nNovo")).toBeNull();
    expect(normalizeGuardiaoDisplayName("N".repeat(121))).toBeNull();
    expect(normalizeGuardiaoDisplayName(undefined)).toBeNull();
  });

  it("preserva a data civil do MySQL sem converter ao dia anterior no Android", () => {
    expect(formatGuardiaoProfileDate("2026-11-11")).toBe("11/11/2026");
    expect(formatGuardiaoProfileDate("2026-02-30")).toBe("Data indisponível");
    expect(formatGuardiaoProfileDate("2026-11-11T02:54:38Z")).toBe("Data indisponível");
  });
});
