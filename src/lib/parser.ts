import pdfParse from "pdf-parse";

/**
 * Parse lab manual from PDF file buffer
 * Extracts text content for further processing
 * 
 * @param fileBuffer - Buffer containing PDF file data
 * @returns Extracted text content or error message
 */
export async function parseLabManual(fileBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    console.error("PDF parse failed:", error);
    return "Failed to parse file.";
  }
}