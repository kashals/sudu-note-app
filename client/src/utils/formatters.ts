export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripPreview(html: string, maxLen = 180): string {
  const raw = stripHtml(html);
  if (!raw) return 'No content added';
  return raw.length > maxLen ? raw.slice(0, maxLen) + '...' : raw;
}

export function formatNoteId(id: number | string): string {
  const numStr = String(id).padStart(3, '0');
  return `NOTE-${numStr}`;
}
