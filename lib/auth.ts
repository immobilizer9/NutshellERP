import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: string;
  organizationId: string;
  roles: string[];
  modules: string[];
};

/**
 * Fallback role→module map for tokens issued before modules were embedded in the JWT.
 * Can be removed once all sessions have been refreshed.
 */
const ROLE_MODULES_FALLBACK: Record<string, string[]> = {
  ADMIN:        ["USER_MANAGEMENT", "AUDIT_LOG", "EXPORTS", "CONTENT_ASSIGN", "CONTENT_REVIEW",
                 "ANALYTICS", "ORDERS", "PIPELINE", "SCHOOLS", "TARGETS", "TEAM_MANAGEMENT",
                 "TASKS", "DAILY_REPORTS", "QUIZ_SESSIONS", "TRAINING_SESSIONS"],
  BD_HEAD:      ["TEAM_MANAGEMENT", "ORDERS", "PIPELINE", "SCHOOLS", "ANALYTICS",
                 "TASKS", "DAILY_REPORTS", "TARGETS"],
  SALES:        ["ORDERS", "PIPELINE", "ANALYTICS", "TASKS", "DAILY_REPORTS"],
  CONTENT_TEAM: ["CONTENT_CREATE", "CONTENT_ASSIGN", "QUIZ_SESSIONS", "TRAINING_SESSIONS"],
  TRAINER:      ["QUIZ_SESSIONS", "TRAINING_SESSIONS", "CONTENT_CREATE"],
  DESIGN_TEAM:  ["DESIGN_WORK"],
};

/** Returns true if the decoded token includes the given module permission. */
export function hasModule(decoded: TokenPayload | null, module: string): boolean {
  if (!decoded) return false;
  // New tokens have modules embedded
  if (decoded.modules?.length) return decoded.modules.includes(module);
  // Fallback for old tokens: derive from roles
  const derived = new Set(decoded.roles.flatMap((r) => ROLE_MODULES_FALLBACK[r] ?? []));
  return derived.has(module);
}

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