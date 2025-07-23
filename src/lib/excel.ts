import * as XLSX from "xlsx";

type ExcelRow = Record<string, string | number | boolean | null>;

export interface ChartSpec {
  graphType: "scatter" | "line" | "bar";
  xLabel: string;
  yLabel: string;
  series: { label: string; column: string; values: number[] }[];
}

/**
 * Process Excel file and extract data for chart generation
 * Reads first worksheet and converts to chart specification format
 * 
 * @param filepath - Path to Excel file
 * @returns Object containing data summary and chart specification
 */
export async function processExcelFile(filepath: string): Promise<{
  summary: string;
  chartSpec: ChartSpec;
}> {
  // Read Excel workbook
  const workbook = XLSX.readFile(filepath);
  const sheetName = workbook.SheetNames[0];
  const sheet = XLSX.utils.sheet_to_json<ExcelRow>(
    workbook.Sheets[sheetName], 
    { defval: null }
  );

  // Extract headers and convert data to numbers
  const headers = Object.keys(sheet[0] || {});
  const rows = sheet.map(row =>
    Object.values(row).map(val =>
      typeof val === "number"
        ? val
        : typeof val === "string"
          ? parseFloat(val)
          : NaN // Fallback for boolean or null values
    )
  );

  // Configure chart specification
  const xLabel = headers[0];
  const yLabels = headers.slice(1);
  
  const chartSpec: ChartSpec = {
    graphType: "scatter",
    xLabel,
    yLabel: "Absorbance units (AU)",
    series: yLabels.map((yLabel) => ({
      // Clean label by removing parenthetical content
      label: yLabel.replace(/\(.*?\)/g, "").trim(),
      // Generate safe column identifier
      column: `tube_${yLabel.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
      // Extract numeric values for this series
      values: sheet.map((row) => {
        const val = row[yLabel];
        return typeof val === "number" ? val : parseFloat(val as string) || 0;
      }),
    }))
  };

  // Generate summary text for reporting
  let summary = `Excel headers: [ ${headers.join(", ")} ]\n`;
  summary += `Excel preview: [\n`;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    summary += `  [ ${rows[i].join(", ")} ]\n`;
  }
  summary += "]";

  return { summary, chartSpec };
}