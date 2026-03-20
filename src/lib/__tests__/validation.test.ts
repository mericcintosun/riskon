/**
 * Tests for src/lib/validation.ts
 * Covers: validateStellarAddress, validateContractId, validateRiskScore,
 *         sanitizeString, validateUrl, validateNumberRange, validateEmail,
 *         validateTransactionHash, validateAmount, validateAssetCode
 * Closes #9
 */
import {
  validateStellarAddress,
  validateContractId,
  validateRiskScore,
  sanitizeString,
  validateUrl,
  validateNumberRange,
  validateEmail,
  validateTransactionHash,
  validateAmount,
  validateAssetCode,
  stripHtmlTags,
  escapeUnsafeHtml,
} from "../validation";

// ── validateStellarAddress ────────────────────────────────────────────────────
describe("validateStellarAddress", () => {
  const VALID_G = "GBQ5K3BYQUPI4NI5IX2XMTTVEPYHSOACDVNLU2KFC2DMZTMXF3JOHJ6T";

  it("returns valid for a correct G... public key", () => {
    const r = validateStellarAddress(VALID_G);
    expect(r.isValid).toBe(true);
    expect(r.sanitized).toBe(VALID_G);
  });

  it("returns invalid for empty string", () => {
    const r = validateStellarAddress("");
    expect(r.isValid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("returns invalid for null/undefined", () => {
    expect(validateStellarAddress(null as any).isValid).toBe(false);
    expect(validateStellarAddress(undefined as any).isValid).toBe(false);
  });

  it("returns invalid for non-string input", () => {
    expect(validateStellarAddress(12345 as any).isValid).toBe(false);
  });

  it("returns invalid for malformed address", () => {
    expect(validateStellarAddress("GNOTVALID").isValid).toBe(false);
  });

  it("trims whitespace before validating", () => {
    const r = validateStellarAddress(`  ${VALID_G}  `);
    expect(r.isValid).toBe(true);
    expect(r.sanitized).toBe(VALID_G);
  });
});

// ── validateContractId ────────────────────────────────────────────────────────
describe("validateContractId", () => {
  it("returns invalid for address not starting with C", () => {
    const r = validateContractId("GBQ5K3BYQUPI4NI5IX2XMTTVEPYHSOACDVNLU2KFC2DMZTMXF3JOHJ6T");
    expect(r.isValid).toBe(false);
    expect(r.error).toMatch(/start with 'C'/);
  });

  it("returns invalid for empty input", () => {
    expect(validateContractId("").isValid).toBe(false);
  });

  it("returns invalid for null", () => {
    expect(validateContractId(null as any).isValid).toBe(false);
  });
});

// ── validateRiskScore ─────────────────────────────────────────────────────────
describe("validateRiskScore", () => {
  it("returns valid for score 0", () => {
    expect(validateRiskScore(0).isValid).toBe(true);
  });

  it("returns valid for score 100", () => {
    expect(validateRiskScore(100).isValid).toBe(true);
  });

  it("returns valid for score 75.6 and rounds it", () => {
    const r = validateRiskScore(75.6);
    expect(r.isValid).toBe(true);
    expect(r.sanitized).toBe(76);
  });

  it("returns valid for string score", () => {
    const r = validateRiskScore("50");
    expect(r.isValid).toBe(true);
  });

  it("returns invalid for score below 0", () => {
    expect(validateRiskScore(-1).isValid).toBe(false);
  });

  it("returns invalid for score above 100", () => {
    expect(validateRiskScore(101).isValid).toBe(false);
  });

  it("returns invalid for NaN", () => {
    expect(validateRiskScore(NaN).isValid).toBe(false);
  });

  it("returns invalid for Infinity", () => {
    expect(validateRiskScore(Infinity).isValid).toBe(false);
  });

  it("returns invalid for non-numeric string", () => {
    expect(validateRiskScore("abc").isValid).toBe(false);
  });
});

// ── sanitizeString ────────────────────────────────────────────────────────────
describe("sanitizeString", () => {
  it("encodes < and > characters", () => {
    expect(sanitizeString("<script>")).toContain("&lt;");
    expect(sanitizeString("<script>")).toContain("&gt;");
  });

  it("encodes double quotes", () => {
    expect(sanitizeString('"hello"')).toContain("&quot;");
  });

  it("encodes single quotes", () => {
    expect(sanitizeString("it's")).toContain("&#x27;");
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitizeString(null as any)).toBe("");
    expect(sanitizeString(undefined as any)).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });
});

// ── validateUrl ───────────────────────────────────────────────────────────────
describe("validateUrl", () => {
  it("returns valid for https URL", () => {
    expect(validateUrl("https://example.com").isValid).toBe(true);
  });

  it("returns valid for http URL", () => {
    expect(validateUrl("http://example.com").isValid).toBe(true);
  });

  it("returns invalid for non-http protocol by default", () => {
    expect(validateUrl("ftp://example.com").isValid).toBe(false);
  });

  it("allows custom protocols", () => {
    expect(validateUrl("ftp://example.com", ["ftp"]).isValid).toBe(true);
  });

  it("returns invalid for malformed URL", () => {
    expect(validateUrl("not-a-url").isValid).toBe(false);
  });

  it("returns invalid for empty input", () => {
    expect(validateUrl("").isValid).toBe(false);
  });
});

// ── validateNumberRange ───────────────────────────────────────────────────────
describe("validateNumberRange", () => {
  it("returns valid for value within range", () => {
    expect(validateNumberRange(5, 0, 10).isValid).toBe(true);
  });

  it("returns valid for boundary values", () => {
    expect(validateNumberRange(0, 0, 10).isValid).toBe(true);
    expect(validateNumberRange(10, 0, 10).isValid).toBe(true);
  });

  it("returns invalid for value below min", () => {
    expect(validateNumberRange(-1, 0, 10).isValid).toBe(false);
  });

  it("returns invalid for value above max", () => {
    expect(validateNumberRange(11, 0, 10).isValid).toBe(false);
  });

  it("returns invalid for NaN", () => {
    expect(validateNumberRange(NaN, 0, 10).isValid).toBe(false);
  });

  it("parses string numbers", () => {
    expect(validateNumberRange("5", 0, 10).isValid).toBe(true);
  });
});

// ── validateEmail ─────────────────────────────────────────────────────────────
describe("validateEmail", () => {
  it("returns valid for a proper email", () => {
    const r = validateEmail("user@example.com");
    expect(r.isValid).toBe(true);
    expect(r.sanitized).toBe("user@example.com");
  });

  it("lowercases the email", () => {
    expect(validateEmail("User@Example.COM").sanitized).toBe("user@example.com");
  });

  it("returns invalid for email without @", () => {
    expect(validateEmail("userexample.com").isValid).toBe(false);
  });

  it("returns invalid for empty string", () => {
    expect(validateEmail("").isValid).toBe(false);
  });

  it("returns invalid for null", () => {
    expect(validateEmail(null as any).isValid).toBe(false);
  });
});

// ── validateTransactionHash ───────────────────────────────────────────────────
describe("validateTransactionHash", () => {
  const VALID_HASH = "a".repeat(64);

  it("returns valid for a 64-char hex string", () => {
    expect(validateTransactionHash(VALID_HASH).isValid).toBe(true);
  });

  it("returns valid for uppercase hex", () => {
    expect(validateTransactionHash("A".repeat(64)).isValid).toBe(true);
  });

  it("lowercases the hash in sanitized output", () => {
    const r = validateTransactionHash("A".repeat(64));
    expect(r.sanitized).toBe("a".repeat(64));
  });

  it("returns invalid for too-short hash", () => {
    expect(validateTransactionHash("abc123").isValid).toBe(false);
  });

  it("returns invalid for non-hex characters", () => {
    expect(validateTransactionHash("g".repeat(64)).isValid).toBe(false);
  });

  it("returns invalid for empty string", () => {
    expect(validateTransactionHash("").isValid).toBe(false);
  });
});

// ── validateAmount ────────────────────────────────────────────────────────────
describe("validateAmount", () => {
  it("returns valid for positive amount", () => {
    expect(validateAmount(10).isValid).toBe(true);
  });

  it("returns valid for string amount", () => {
    expect(validateAmount("5.5").isValid).toBe(true);
  });

  it("returns invalid for zero", () => {
    expect(validateAmount(0).isValid).toBe(false);
  });

  it("returns invalid for negative", () => {
    expect(validateAmount(-1).isValid).toBe(false);
  });

  it("returns invalid for too many decimal places", () => {
    expect(validateAmount("0.12345678", 7).isValid).toBe(false);
  });

  it("returns valid for exactly 7 decimal places", () => {
    expect(validateAmount("0.1234567", 7).isValid).toBe(true);
  });

  it("returns invalid for null/undefined", () => {
    expect(validateAmount(null as any).isValid).toBe(false);
  });
});

// ── validateAssetCode ─────────────────────────────────────────────────────────
describe("validateAssetCode", () => {
  it("returns valid for XLM", () => {
    expect(validateAssetCode("XLM").isValid).toBe(true);
  });

  it("uppercases the asset code", () => {
    expect(validateAssetCode("usdc").sanitized).toBe("USDC");
  });

  it("returns invalid for code longer than 12 chars", () => {
    expect(validateAssetCode("TOOLONGASSET1").isValid).toBe(false);
  });

  it("returns invalid for empty code", () => {
    expect(validateAssetCode("").isValid).toBe(false);
  });

  it("returns invalid for null", () => {
    expect(validateAssetCode(null as any).isValid).toBe(false);
  });
});

// ── stripHtmlTags ─────────────────────────────────────────────────────────────
describe("stripHtmlTags", () => {
  it("removes HTML tags", () => {
    expect(stripHtmlTags("<p>hello</p>")).toBe("hello");
  });

  it("returns empty string for null", () => {
    expect(stripHtmlTags(null as any)).toBe("");
  });

  it("leaves plain text unchanged", () => {
    expect(stripHtmlTags("hello world")).toBe("hello world");
  });
});
