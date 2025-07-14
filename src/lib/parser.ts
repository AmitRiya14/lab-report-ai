// --- /lib/parser.ts ---
import pdfParse from "pdf-parse";

export async function parseLabManual(fileBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    console.error("PDF parse failed:", error);
    return "Failed to parse file.";
  }

}