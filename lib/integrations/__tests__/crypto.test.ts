// @ts-nocheck
/**
 * Tests for lib/integrations/crypto.ts - AES-256-GCM encrypt/decrypt
 */

jest.mock("@/lib/env", () => ({
  serverEnv: jest.fn(() => ({
    ENCRYPTION_KEY: "a".repeat(64), // 64 hex chars = 32 bytes
  })),
}));

import { encrypt, decrypt } from "@/lib/integrations/crypto";

describe("encrypt", () => {
  it("returns a string in iv:authTag:ciphertext format", () => {
    const result = encrypt("hello world");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("returns different ciphertext each call (random IV)", () => {
    const result1 = encrypt("same plaintext");
    const result2 = encrypt("same plaintext");
    expect(result1).not.toBe(result2);
  });

  it("encrypts various string types", () => {
    expect(() => encrypt("simple string")).not.toThrow();
    expect(() => encrypt('{"key": "value", "num": 42}')).not.toThrow();
    expect(() => encrypt("")).not.toThrow();
    expect(() => encrypt("unicode: 🔐 åñü")).not.toThrow();
  });
});

describe("decrypt", () => {
  it("decrypts to original plaintext", () => {
    const plaintext = "my secret api key";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("decrypts JSON strings correctly", () => {
    const json = JSON.stringify({ token: "abc123", expires: 1234567890 });
    const encrypted = encrypt(json);
    expect(decrypt(encrypted)).toBe(json);
  });

  it("decrypts empty string", () => {
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("decrypts unicode strings", () => {
    const text = "Special chars: åñü 🔐 中文";
    const encrypted = encrypt(text);
    expect(decrypt(encrypted)).toBe(text);
  });

  it("throws when format is invalid (not 3 parts)", () => {
    expect(() => decrypt("not-valid-format")).toThrow("Invalid encrypted data format");
    expect(() => decrypt("only:two")).toThrow("Invalid encrypted data format");
    expect(() => decrypt("a:b:c:d")).toThrow("Invalid encrypted data format");
  });

  it("throws when IV has wrong length", () => {
    // Provide an IV that decodes to wrong length
    const validEncrypted = encrypt("test");
    const parts = validEncrypted.split(":");
    // Replace IV with a shorter base64 value
    const tamperedIV = "dGVzdA=="; // "test" base64 = 4 bytes, not 16
    const tampered = `${tamperedIV}:${parts[1]}:${parts[2]}`;
    expect(() => decrypt(tampered)).toThrow("Invalid IV or auth tag length");
  });

  it("throws when auth tag is wrong (tampered ciphertext)", () => {
    const encrypted = encrypt("original");
    const parts = encrypted.split(":");
    // Corrupt the ciphertext
    const corrupted = `${parts[0]}:${parts[1]}:AAAAAAAAAAAAAAAA`;
    expect(() => decrypt(corrupted)).toThrow();
  });
});

describe("encrypt/decrypt roundtrip", () => {
  const testCases = [
    "simple string",
    "api_key_123456789",
    JSON.stringify({ access_token: "ya29.xxx", refresh_token: "1//xxx" }),
    "a".repeat(1000),
    "line1\nline2\nline3",
  ];

  testCases.forEach((plaintext) => {
    it(`correctly roundtrips: "${plaintext.substring(0, 30)}..."`, () => {
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
