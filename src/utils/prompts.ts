// --- PATCHED: /src/utils/prompts.ts ---
export const generateLabReportPrompt = (manualText: string, rawData: string): string => {
  const cleanedManual = manualText
    .split("\n")
    .filter((line, idx, arr) => line.trim() !== "" && line.trim() !== arr[idx - 1]?.trim())
    .join("\n");

  return `You are a scientific writer. Your task is to write a complete, original lab report using ONLY the lab manual and raw data below. You must follow the expected structure and tone of a university-level physiology lab report.

---
📘 Lab Manual:
${cleanedManual}

${rawData && rawData !== "No raw data was provided. Please interpret results based on expected trends and procedures." ? `📊 Raw Data Summary:\n${rawData}` : ""}

📋 Grading Rubric Expectations:
• Title: Clear and descriptive, includes student name, date, experiment number
• Abstract: Covers rationale, objective, hypothesis, key methods, results, and conclusion
• Introduction: Explains digestion, enzymes involved, relevant mechanisms, hypotheses with citation support
• Methods: Concise but detailed enough to indicate exact treatments used per test tube or condition
• Results: Describe visual/quantitative outcomes per condition (e.g. test tube by test tube), use appropriate tables with labeled units
• Discussion: Analyze why results occurred with reference to molecular mechanisms and published literature (cite minimum 15–20 peer-reviewed articles in Harvard style)
• Conclusion: Link back to each hypothesis with outcome
• References: Include 15–25 real, peer-reviewed primary sources related to the experiments described. Use Harvard style (Author, Year). Sources must be scientifically appropriate for each scientific concept. You may cite classic or recent studies, but do not invent references. Base all citations on the processes and enzyme behaviors described in the lab manual and raw data.
• Appendix: Include raw absorbance data if mentioned in lab manual

📈 Chart Configuration Output:
In addition to the lab report, output a valid Chart.js config object called \`chartSpec\`. This object MUST include the following:
- \`graphType\`: one of "bar", "line", or "scatter"
- \`xLabel\` and \`yLabel\`: axis labels as strings
- \`labels\`: array of x-axis values
- \`series\`: an array of objects, each with:
  - \`label\`: name of the dataset
  - \`values\`: array of y-axis values, or for scatter: array of { x, y } objects

Ensure \`series\` aligns with the experimental conditions and variables analyzed. Use real values from the data summary.

✍️ Instructions:
Generate a lab report that mirrors the structure and flow of previous student submissions (like the one shown below), using precise scientific phrasing. Keep the Results section procedural and analytical (not interpretive). Keep the Discussion literature-heavy and mechanistic. Cite real peer-reviewed sources in Harvard style. Format tables cleanly with labeled columns and units.`;
};
