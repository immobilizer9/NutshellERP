import { describe, it, expect, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import { verifyToken, getTokenFromRequest } from "../auth";

const SECRET = "test-jwt-secret";

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

describe("verifyToken", () => {
  it("returns payload for a valid token", () => {
    const token = jwt.sign(
      { userId: "u1", organizationId: "org1", roles: ["ADMIN"] },
      SECRET,
      { expiresIn: "1h" }
    );
    const result = verifyToken(token);
    expect(result?.userId).toBe("u1");
    expect(result?.roles).toContain("ADMIN");
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
