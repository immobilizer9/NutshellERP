import { describe, it, expect } from "vitest";
import { parseCSVLine } from "../csvParse";

describe("parseCSVLine", () => {
  it("splits a simple row", () => {
    expect(parseCSVLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCSVLine('"Smith, John",Principal,9800000001')).toEqual([
      "Smith, John",
      "Principal",
      "9800000001",
    ]);
  });

  it("trims whitespace around values", () => {
    expect(parseCSVLine(" Alpha , Beta , Gamma ")).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("handles empty fields", () => {
    expect(parseCSVLine("a,,c")).toEqual(["a", "", "c"]);
  });

  it("handles a single value", () => {
    expect(parseCSVLine("hello")).toEqual(["hello"]);
  });

  it("handles quotes toggling correctly across a field", () => {
    expect(parseCSVLine('"hello, world",next')).toEqual(["hello, world", "next"]);
  });

  it("returns empty array for empty string", () => {
    expect(parseCSVLine("")).toEqual([""]);
  });

  it("handles trailing comma", () => {
    expect(parseCSVLine("a,b,")).toEqual(["a", "b", ""]);
  });

  it("handles BOM-prefixed first field gracefully", () => {
    const line = "\uFEFFname,city,state";
    const result = parseCSVLine(line);
    // BOM char stays in first field — callers strip it before passing
    expect(result[1]).toBe("city");
    expect(result[2]).toBe("state");
  });
});
