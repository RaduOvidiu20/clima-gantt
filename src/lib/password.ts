import { createHash } from "crypto";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password, "utf8").digest("base64");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
