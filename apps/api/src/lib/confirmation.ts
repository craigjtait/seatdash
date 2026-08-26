import crypto from "node:crypto";

export function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = [4, 4] as const;
  return segments
    .map((len) =>
      Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join("")
    )
    .join("-");
}

export function hashConfirmationCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase().replace(/-/g, "")).digest("hex");
}

export function normalizeConfirmationCode(code: string): string {
  return code.toUpperCase().replace(/\s/g, "");
}
