import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "tutornest_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminPayload = {
  email: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSigningSecret() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return null;
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();
  const normalizedPassword = adminPassword.replace(/\r?\n/g, "").trim();

  return `${normalizedEmail}::${normalizedPassword}`;
}

function signPayload(payloadEncoded: string, secret: string) {
  return createHmac("sha256", secret).update(payloadEncoded).digest("base64url");
}

export function createAdminSessionToken(email: string) {
  const secret = getSigningSecret();
  if (!secret) {
    return null;
  }

  const payload: AdminPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token) {
    return false;
  }

  const secret = getSigningSecret();
  if (!secret) {
    return false;
  }

  const [payloadEncoded, receivedSignature] = token.split(".");
  if (!payloadEncoded || !receivedSignature) {
    return false;
  }

  const expectedSignature = signPayload(payloadEncoded, secret);
  const received = Buffer.from(receivedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as AdminPayload;
    if (!payload.email || payload.exp <= Math.floor(Date.now() / 1000)) {
      return false;
    }

    const normalizedAdminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    return payload.email.toLowerCase() === normalizedAdminEmail;
  } catch {
    return false;
  }
}

export function getAdminSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}
