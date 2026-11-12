import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const HASH_BYTES = 64;

/** Nunca armazene senhas em texto puro. Cada senha usa um salt aleatório. */
export async function hashGuardiaoPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = (await scrypt(password, salt, HASH_BYTES)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyGuardiaoPassword(password: string, stored: string): Promise<boolean> {
  const pieces = stored.split("$");
  if (pieces.length !== 3 || pieces[0] !== "scrypt") return false;
  const [, salt, digest] = pieces;
  if (!/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{128}$/.test(digest)) return false;
  const expected = Buffer.from(digest, "hex");
  const calculated = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(expected, calculated);
}
