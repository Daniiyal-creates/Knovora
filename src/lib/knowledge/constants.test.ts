import { describe, it, expect } from "vitest";
import { validateFile, sanitizeFilename, getExtension, MAX_FILE_BYTES } from "./constants";

describe("getExtension", () => {
  it("extracts and lowercases the extension", () => {
    expect(getExtension("Report.PDF")).toBe("pdf");
    expect(getExtension("notes.md")).toBe("md");
    expect(getExtension("noext")).toBe("");
  });
});

describe("validateFile", () => {
  it("accepts an allowed type within size", () => {
    expect(validateFile({ name: "a.pdf", size: 1000 }).ok).toBe(true);
    expect(validateFile({ name: "a.docx", size: 1000 }).ok).toBe(true);
    expect(validateFile({ name: "a.txt", size: 1000 }).ok).toBe(true);
    expect(validateFile({ name: "a.md", size: 1000 }).ok).toBe(true);
  });

  it("rejects a disallowed type", () => {
    const r = validateFile({ name: "malware.exe", size: 1000 });
    expect(r.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateFile({ name: "a.pdf", size: 0 }).ok).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    expect(validateFile({ name: "a.pdf", size: MAX_FILE_BYTES + 1 }).ok).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("replaces unsafe characters and collapses underscores", () => {
    expect(sanitizeFilename("my file (1).pdf")).toBe("my_file_1_.pdf");
  });
  it("never returns an empty string", () => {
    expect(sanitizeFilename("***")).toBe("_");
  });
});
