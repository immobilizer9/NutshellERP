import { describe, it, expect } from "vitest";
import {
  loginSchema,
  createTopicSchema,
  patchTopicSchema,
  createDocSchema,
  patchDocSchema,
} from "../validate";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const r = loginSchema.safeParse({ email: "user@example.com", password: "secret123" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const r = loginSchema.safeParse({ email: "not-an-email", password: "secret123" });
    expect(r.success).toBe(false);
  });

  it("rejects short password", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "123" });
    expect(r.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });
});

describe("createTopicSchema", () => {
  const valid = {
    title: "Chapter 1", productType: "ANNUAL" as const,
    classFrom: 1, classTo: 5,
    assignedToId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("accepts a valid topic", () => {
    expect(createTopicSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid productType", () => {
    const r = createTopicSchema.safeParse({ ...valid, productType: "UNKNOWN" });
    expect(r.success).toBe(false);
  });

  it("rejects class > 12", () => {
    const r = createTopicSchema.safeParse({ ...valid, classFrom: 13 });
    expect(r.success).toBe(false);
  });

  it("rejects non-UUID assignedToId", () => {
    const r = createTopicSchema.safeParse({ ...valid, assignedToId: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("rejects empty title", () => {
    const r = createTopicSchema.safeParse({ ...valid, title: "" });
    expect(r.success).toBe(false);
  });
});

describe("patchTopicSchema", () => {
  it("accepts a valid patch", () => {
    const r = patchTopicSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "IN_PROGRESS",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const r = patchTopicSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "DELETED",
    });
    expect(r.success).toBe(false);
  });
});

describe("createDocSchema", () => {
  it("accepts a valid document", () => {
    const r = createDocSchema.safeParse({
      topicId: "550e8400-e29b-41d4-a716-446655440000",
      title:   "My Document",
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-UUID topicId", () => {
    const r = createDocSchema.safeParse({ topicId: "bad", title: "Title" });
    expect(r.success).toBe(false);
  });
});

describe("patchDocSchema", () => {
  it("accepts an action", () => {
    const r = patchDocSchema.safeParse({
      id:     "550e8400-e29b-41d4-a716-446655440000",
      action: "approve",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown action", () => {
    const r = patchDocSchema.safeParse({
      id:     "550e8400-e29b-41d4-a716-446655440000",
      action: "nuke",
    });
    expect(r.success).toBe(false);
  });
});
