// --- /lib/excel.ts ---
import * as XLSX from "xlsx";

export interface ChartSpec {
  graphType: "scatter" | "line" | "bar";
  xLabel: string;
  yLabel: string;
  series: { label: string; column: string }[];
}

export async function processExcelFile(filepath: string): Promise<{
  summary: string;
  chartSpec: ChartSpec;
}> {
  const workbook = XLSX.readFile(filepath);
  const sheetName = workbook.SheetNames[0];
  const sheet = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], { defval: null });

  const headers = Object.keys(sheet[0] || {});
  const rows = sheet.map(row => Object.values(row).map(val => typeof val === "number" ? val : parseFloat(val)));

  const xLabel = headers[0];
  const yLabels = headers.slice(1);
  const chartSpec: ChartSpec = {
    graphType: "scatter",
    xLabel,
    yLabel: "Absorbance units (AU)",
    series: yLabels.map(label => ({ label: label.replace(/\(.*?\)/g, "").trim(), column: `tube_${label.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}` }))
  };

  let summary = `Excel headers: [ ${headers.join(", ")} ]\n`;
  summary += `Excel preview: [\n`;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    summary += `  [ ${rows[i].join(", ")} ]\n`;
  }
  summary += "]";

  return { summary, chartSpec };
}
