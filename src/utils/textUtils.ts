// ========================================
// FILE: utils/textUtils.ts
// Text processing utilities
// ========================================

/**
 * Strip markdown formatting from text for clean display
 */
export function stripMarkdownSync(text: string): string {
  return text
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove bold and italic formatting
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+(.+)$/gm, '$1')
    // Convert list markers to simple bullets
    .replace(/^[\s]*[-*+]\s+(.+)$/gm, '• $1')
    .replace(/^[\s]*\d+\.\s+(.+)$/gm, '$1')
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean HTML content for export
 */
export function cleanHtmlForExport(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove all edit-related elements
  const elementsToRemove = [
    '.inline-edit-suggestion',
    '.inline-action-box',
    '.streaming-content',
    '[data-processing]'
  ];
  
  elementsToRemove.forEach(selector => {
    tempDiv.querySelectorAll(selector).forEach(el => {
      if (selector === '.inline-edit-suggestion') {
        // Replace with text content
        const textContent = el.textContent || '';
        el.replaceWith(document.createTextNode(textContent));
      } else {
        // Remove completely
        el.remove();
      }
    });
  });
  
  return tempDiv.innerHTML;
}