import { describe, expect, it } from "vitest";
import { toDate } from "../../src/lib/dates.js";

describe("toDate", () => {
  it("returns undefined for null, undefined, empty string, and 0", () => {
    expect(toDate(null)).toBeUndefined();
    expect(toDate(undefined)).toBeUndefined();
    expect(toDate("")).toBeUndefined();
    expect(toDate(0)).toBeUndefined();
  });

  it("parses yt-dlp YYYYMMDD strings", () => {
    expect(toDate("20241104")).toBe("2024-11-04");
  });

  it("parses 10-digit unix-seconds strings via epoch conversion", () => {
    // 1700000000 seconds -> 2023-11-14T22:13:20.000Z
    expect(toDate("1700000000")).toBe("2023-11-14");
  });

  it("parses 13-digit unix-millis strings via epoch conversion", () => {
    expect(toDate("1700000000000")).toBe("2023-11-14");
  });

  it("parses ISO date strings", () => {
    expect(toDate("2025-11-01T12:00:00Z")).toBe("2025-11-01");
    expect(toDate("2025-11-01")).toBe("2025-11-01");
  });

  it("returns undefined for unparseable strings", () => {
    expect(toDate("not-a-date")).toBeUndefined();
    expect(toDate("nonsense-123-xyz")).toBeUndefined();
  });

  it("parses numeric unix-seconds timestamps (< 1e12)", () => {
    expect(toDate(1700000000)).toBe("2023-11-14");
  });

  it("parses numeric unix-millis timestamps (> 1e12)", () => {
    expect(toDate(1700000000000)).toBe("2023-11-14");
  });

  it("returns undefined for non-finite numbers", () => {
    expect(toDate(Number.NaN)).toBeUndefined();
    expect(toDate(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it("returns undefined for booleans and objects (unsupported types)", () => {
    expect(toDate(true)).toBeUndefined();
    expect(toDate({})).toBeUndefined();
    expect(toDate([])).toBeUndefined();
  });

  it("trims whitespace before matching the YYYYMMDD/epoch patterns", () => {
    expect(toDate("  20241104  ")).toBe("2024-11-04");
  });
});
