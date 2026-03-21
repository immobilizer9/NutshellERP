import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: string;
  organizationId: string;
  roles: string[];
};

/**
 * Verifies the JWT signature and returns the decoded payload.
 * Returns null if the token is missing, expired, or tampered with.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts the raw token string from the request cookie header.
 * Returns null if no token cookie is present.
 */
export function getTokenFromRequest(req: Request): string | null {
  return req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1] ?? null;
}