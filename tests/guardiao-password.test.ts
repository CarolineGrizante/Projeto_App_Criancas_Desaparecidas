import { describe, expect, it } from "vitest";
import { hashGuardiaoPassword, verifyGuardiaoPassword } from "../server/guardiao-password";

describe("Guardião - senhas locais", () => {
  it("hash não armazena a senha e valida senha correta", async () => {
    const plain = "SenhaDeTeste@2026";
    const hash = await hashGuardiaoPassword(plain);
    expect(hash).not.toContain(plain);
    expect(await verifyGuardiaoPassword(plain, hash)).toBe(true);
    expect(await verifyGuardiaoPassword("senha-incorreta", hash)).toBe(false);
  });
  it("usa salt individual", async () => {
    const first = await hashGuardiaoPassword("SenhaDeTeste@2026");
    const second = await hashGuardiaoPassword("SenhaDeTeste@2026");
    expect(first).not.toBe(second);
  });
});
