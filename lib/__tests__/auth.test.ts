import { describe, it, expect, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import { verifyToken, getTokenFromRequest, hasModule } from "../auth";

const SECRET = "test-jwt-secret";

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

describe("verifyToken", () => {
  it("returns payload for a valid token", () => {
    const token = jwt.sign(
      { userId: "u1", organizationId: "org1", roles: ["ADMIN"], modules: ["USER_MANAGEMENT"] },
      SECRET,
      { expiresIn: "1h" }
    );
    const result = verifyToken(token);
    expect(result?.userId).toBe("u1");
    expect(result?.roles).toContain("ADMIN");
    expect(result?.modules).toContain("USER_MANAGEMENT");
  });

  it("returns null for a tampered token", () => {
    const token = jwt.sign({ userId: "u1", organizationId: "org1", roles: [] }, SECRET);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyToken(tampered)).toBeNull();
  });

  it("returns null for an expired token", () => {
    const token = jwt.sign(
      { userId: "u1", organizationId: "org1", roles: [] },
      SECRET,
      { expiresIn: "-1s" }
    );
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for a garbage string", () => {
    expect(verifyToken("not.a.token")).toBeNull();
  });
});

describe("hasModule", () => {
  it("returns true when the module is present", () => {
    const payload = { userId: "u1", organizationId: "org1", roles: ["SALES"], modules: ["ORDERS", "PIPELINE"] };
    expect(hasModule(payload, "ORDERS")).toBe(true);
  });

  it("returns false when the module is absent", () => {
    const payload = { userId: "u1", organizationId: "org1", roles: ["SALES"], modules: ["ORDERS"] };
    expect(hasModule(payload, "USER_MANAGEMENT")).toBe(false);
  });

  it("returns false for a null payload", () => {
    expect(hasModule(null, "ORDERS")).toBe(false);
  });
});

describe("getTokenFromRequest", () => {
  function makeReq(cookieHeader: string): Request {
    return new Request("http://localhost/", {
      headers: { cookie: cookieHeader },
    });
  }

  it("extracts the token from a cookie header", () => {
    const req = makeReq("token=abc123; other=xyz");
    expect(getTokenFromRequest(req)).toBe("abc123");
  });

  it("returns null when the token cookie is absent", () => {
    const req = makeReq("session=abc; user=xyz");
    expect(getTokenFromRequest(req)).toBeNull();
  });

  it("returns null when cookie header is empty", () => {
    const req = makeReq("");
    expect(getTokenFromRequest(req)).toBeNull();
  });
});
