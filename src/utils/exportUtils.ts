// ========================================
// FILE: utils/exportUtils.ts
// Professional export functions for lab reports
// ========================================

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

/**
 * Export report as professional PDF with Times New Roman formatting
 */
export const exportToAdvancedPDF = async (
  reportElement: HTMLElement,
  title: string
): Promise<void> => {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    
    const reportClone = reportElement.cloneNode(true) as HTMLElement;
    
    // Clean up edit suggestions
    reportClone.querySelectorAll('.inline-edit-suggestion').forEach(el => {
      const textContent = el.textContent || '';
      el.replaceWith(document.createTextNode(textContent));
    });
    reportClone.querySelectorAll('.inline-action-box').forEach(el => el.remove());
    
    const printStyles = `
      <style>
        @media print {
          body { 
            font-family: "Times New Roman", serif !important;
            font-size: 12pt !important;
            line-height: 2 !important;
            color: #000 !important;
            background: white !important;
            margin: 0;
            padding: 20pt;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: "Times New Roman", serif !important;
            font-weight: bold !important;
            margin-top: 24pt !important;
            margin-bottom: 12pt !important;
            color: #000 !important;
          }
          p {
            margin-bottom: 12pt !important;
            text-align: justify !important;
            text-indent: 0.5in;
          }
          .page-break {
            page-break-before: always !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    `;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          ${printStyles}
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 48pt;">
            <h1 style="font-size: 16pt; margin-bottom: 24pt; font-weight: bold;">${title}</h1>
          </div>
          ${reportClone.innerHTML}
        </body>
      </html>
    `;
    
    const options = {
      margin: [1, 1, 1, 1],
      filename: `${sanitizeFilename(title)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait'
      }
    };
    
    await html2pdf().set(options).from(htmlContent).save();
  } catch (error) {
    console.error('Advanced PDF export failed:', error);
    throw new Error('PDF export failed. Please try again.');
  }
};

/**
 * Export report as professional Word document
 */
export const exportToWord = async (
  reportHtml: string, 
  title: string, 
  studentName: string, 
  date: string
): Promise<void> => {
  const cleanText = htmlToFormattedText(reportHtml);
  const sections = cleanText.split('\n\n');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const children: any[] = [];
  
  // Title page
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32,
          font: "Times New Roman",
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Student: ${studentName}`,
          size: 24,
          font: "Times New Roman",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${date}`,
          size: 24,
          font: "Times New Roman",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Content sections
  sections.forEach(section => {
    if (!section.trim()) return;
    
    if (section.trim().startsWith('#')) {
      const headingText = section.replace(/^#+\s*/, '');
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              size: 28,
              font: "Times New Roman",
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section,
              font: "Times New Roman",
              size: 24,
            })
          ],
          spacing: { after: 240 },
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: children,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24,
          },
          paragraph: {
            spacing: {
              line: 480,
            },
          },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${sanitizeFilename(title)}.docx`);
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert HTML to clean formatted text
 */
function htmlToFormattedText(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove edit suggestions and action boxes
  tempDiv.querySelectorAll('.inline-edit-suggestion').forEach(el => {
    const textContent = el.textContent || '';
    el.replaceWith(document.createTextNode(textContent));
  });
  tempDiv.querySelectorAll('.inline-action-box').forEach(el => el.remove());
  
  let text = tempDiv.innerText || tempDiv.textContent || '';
  
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  return text;
}

/**
 * Sanitize filename for safe file downloads
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
