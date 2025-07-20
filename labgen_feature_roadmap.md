# 🧠 Lab Report Generator – Feature Roadmap (Ideas & Suggestions)

This document captures **all new features, ideas, and suggestions** discussed to date. These are intended to enhance the AI-powered lab report generator in accuracy, customization, editability, export options, and user monetization.

---

## 🧾 Report Editing & UX Enhancements

- Paginated Word-like interface (mimics MS Word)
- WYSIWYG editing with margins and Times New Roman styling
- Inline Claude-powered edits (highlight + right-click "Improve")
- Claude streaming output (word-by-word rendering)
- One-click revision buttons per section (e.g. "Improve Discussion")
- Generalized rubric validator with live checklist
- Claude prompt optimization (compressed manual/rubric)
- Modular Claude prompts per section
- Diff viewer for AI rewrites
- AI-generated sidebar comments (Word-style suggestions)

---

## 📊 Charting & Data Visualization

- Move Chart.js graphs inside report content div
- Editable data table linked to chart (2-way binding)
- Live Chart.js updates from table edits
- Chart type toggle: scatter ↔ line ↔ bar
- Error bars (SEM) via chartjs-plugin-error-bars
- Trendline calculation (linear regression)
- Display R² value next to trendline
- Editable legend, axis labels, colors, line thickness, font
- Toggle gridlines, tooltips, ticks
- Multi-series support (e.g. NH4Cl vs Urea)

---

## 📤 Export Options

- Export report to PDF, DOCX, TXT
- Export Chart.js as PNG, SVG
- Export chart data to CSV (editable in Excel)
- Excel export with data + image (no chart object)
- Excel template with linked chart workaround
- Import edited CSV to regenerate chart

---

## 💳 Subscription & Monetization

- Stripe subscription integration (Basic, Pro, Plus tiers)
- Webhook-based usage counter
- Monthly quota tracker with UI indicator
- Claude cost modeling (Sonnet vs Opus)
- Required user calculator for target profit
- Price vs margin vs cost table calculator

---

## ⚙️ System Architecture

- Claude response caching via content hash
- Claude retry/fallback handler
- Claude prompt preview (developer mode)
- ChartSpec-to-SheetJS mapping function
- GitHub-ready CI/CD integration for Claude + chart rendering pipeline

---

## 🧪 Future AI Enhancements

- Claude auto-suggest references based on topic
- Claude interprets trendline/error bars
- Claude re-analyzes results if chart/table changes
- Claude enforces style formatting (Harvard, captions)
- Claude generates multiple figures from different datasets

---

## ✅ Suggested Workflow Tools

- Convert this roadmap to GitHub Projects board
- Use labels: `frontend`, `claude`, `chart`, `export`, `premium`
- Link to `/pages/report.tsx`, `/utils/prompts.ts`, `/lib/chart.ts`, `/api/upload.ts`

# Labify

**Smart. Simple. Scientific.**  
A modern lab report generator built for students, researchers, and educators.

---

## 🎨 Brand Style Guide

### ✅ Primary Colors
| Name         | Hex       | Usage                        |
|--------------|-----------|------------------------------|
| Teal         | `#0F9D94` | Primary buttons, logo, icons |
| Light Grey   | `#F8F9FA` | Background, sections         |
| Slate Text   | `#334155` | Headings and labels          |
| Neutral Grey | `#E5E7EB` | Card backgrounds, borders    |
| Accent White | `#FFFFFF` | Main background              |

---

## ✨ Design Principles

- **Clean and Academic**: White and grey backgrounds with strong contrast for readability
- **Trustworthy and Modern**: Teal conveys credibility without feeling corporate
- **Student-Friendly UX**: Large buttons, readable fonts, mobile-responsive layout

---

## 🖼️ UI Components (Planned)

- Navigation Bar
- Hero Section with CTA
- Upload Panel (for lab manual + Excel)
- Auto-generated Report Viewer
- Dark Mode Toggle (optional)

---

## 📱 Typography

- Headings: `Inter Bold` or `Poppins SemiBold`
- Body: `Inter Regular` or `Roboto`
- Font Colors: Slate Grey `#334155` or Deep Charcoal `#1F2937`

---

## 🔗 Sample CTA Button

```html
<button style="background-color: #0F9D94; color: white; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
  Generate Lab Report
</button>
