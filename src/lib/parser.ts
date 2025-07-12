// --- /lib/parser.ts ---
import pdfParse from "pdf-parse";

export async function parseLabManual(fileBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    return "Failed to parse file.";
  }
}