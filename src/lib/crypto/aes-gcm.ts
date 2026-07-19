import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const VERSION = "v1";
const ALGO = "aes-256-gcm";

export type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptionVersion: string;
};

function keyFromEnv(raw: string): Buffer {
  const trimmed = raw.trim();
  // Accept 64 hex chars or any passphrase (hashed to 32 bytes).
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  return createHash("sha256").update(trimmed, "utf8").digest();
}

export function encryptAesGcm(plaintext: string, encryptionKey: string): EncryptedBlob {
  const key = keyFromEnv(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    encryptionVersion: VERSION,
  };
}

export function decryptAesGcm(blob: EncryptedBlob, encryptionKey: string): string {
  if (blob.encryptionVersion !== VERSION) {
    throw new Error("Unsupported encryption version");
  }
  const key = keyFromEnv(encryptionKey);
  const decipher = createDecipheriv(ALGO, key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Cryptographically secure 32-byte key as hex (for installer). */
export function generateEncryptionKeyHex(): string {
  return randomBytes(32).toString("hex");
}

/** Never include ciphertext/iv/tag in logs — presence only. */
export function encryptedBlobPresent(blob: Partial<EncryptedBlob> | null | undefined): boolean {
  return Boolean(blob?.ciphertext && blob?.iv && blob?.authTag);
}
