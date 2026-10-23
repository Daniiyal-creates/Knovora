import mammoth from "mammoth";
import { getExtension } from "@/lib/knowledge/constants";
import { normalizeText } from "./normalize";

/**
 * Extract plain text from a document buffer based on its filename extension.
 * Supports pdf, docx, txt, md.
 */
export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = getExtension(filename);

  switch (ext) {
    case "pdf": {
      // Import the lib entry directly to avoid pdf-parse's debug self-test
      // that runs when the package is loaded as the main module.
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const data = await pdfParse(buffer);
      return normalizeText(data.text);
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return normalizeText(result.value);
    }
    case "txt":
    case "md":
      return normalizeText(buffer.toString("utf8"));
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
