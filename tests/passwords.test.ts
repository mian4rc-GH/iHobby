import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/server/passwords";

describe("password hashing", () => {
  it("verifies a password against its scrypt hash", async () => {
    const hash = await hashPassword("Buyer@123");

    await expect(verifyPassword("Buyer@123", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("uses a unique salt for each hash", async () => {
    const first = await hashPassword("SamePassword@123");
    const second = await hashPassword("SamePassword@123");

    expect(first).not.toBe(second);
    expect(first).toMatch(/^scrypt\$/);
    expect(second).toMatch(/^scrypt\$/);
  });

  it("rejects empty and malformed hashes", async () => {
    await expect(verifyPassword("Buyer@123", undefined)).resolves.toBe(false);
    await expect(verifyPassword("Buyer@123", "")).resolves.toBe(false);
    await expect(verifyPassword("Buyer@123", "plain-text")).resolves.toBe(false);
  });
});
