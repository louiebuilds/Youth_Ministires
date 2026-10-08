import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

type EncryptedFamilyPass = {
  tokenHash: string;
  ciphertext: string;
  iv: string;
  authTag: string;
};

function getEncryptionKey() {
  const encoded =
    process.env.FAMILY_PASS_ENCRYPTION_KEY;

  if (!encoded) {
    throw new Error(
      "FAMILY_PASS_ENCRYPTION_KEY is not configured.",
    );
  }

  const key = Buffer.from(
    encoded,
    "base64",
  );

  if (key.length !== 32) {
    throw new Error(
      "FAMILY_PASS_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return key;
}

export function createFamilyPassToken() {
  return [
    randomBytes(32).toString("hex"),
    randomBytes(32).toString("hex"),
  ].join("");
}

export function encryptFamilyPass(
  token: string,
): EncryptedFamilyPass {
  const key = getEncryptionKey();

  const iv = randomBytes(12);

  const cipher = createCipheriv(
    "aes-256-gcm",
    key,
    iv,
  );

  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTag =
    cipher.getAuthTag();

  const tokenHash = createHash("sha256")
    .update(token, "utf8")
    .digest("hex");

  return {
    tokenHash,
    ciphertext:
      ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag:
      authTag.toString("base64"),
  };
}

export function decryptFamilyPass({
  ciphertext,
  iv,
  authTag,
}: {
  ciphertext: string;
  iv: string;
  authTag: string;
}) {
  const key = getEncryptionKey();

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64"),
  );

  decipher.setAuthTag(
    Buffer.from(
      authTag,
      "base64",
    ),
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(
        ciphertext,
        "base64",
      ),
    ),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}