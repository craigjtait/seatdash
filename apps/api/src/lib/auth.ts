import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "seatdash_delivery_token";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return new TextEncoder().encode(secret);
}

export async function createDeliveryToken(): Promise<string> {
  return new SignJWT({ role: "delivery" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyDeliveryToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "delivery";
  } catch {
    return false;
  }
}

export { COOKIE_NAME };

export function verifyStaffPin(pin: string): boolean {
  const expected = process.env.DELIVERY_STAFF_PIN ?? "1234";
  return pin === expected;
}
