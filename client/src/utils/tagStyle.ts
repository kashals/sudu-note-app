export function getTagStyle(tag: string) {
  const norm = tag.trim().toLowerCase();
  if (norm === 'important') {
    return { background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' };
  }
  if (norm === 'urgent') {
    return { background: 'rgba(249, 115, 22, 0.08)', borderColor: 'rgba(249, 115, 22, 0.3)', color: '#fb923c' };
  }
  if (norm === 'review') {
    return { background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' };
  }
  if (norm === 'later') {
    return { background: 'rgba(168, 85, 247, 0.08)', borderColor: 'rgba(168, 85, 247, 0.25)', color: '#c084fc' };
  }
  return { background: 'rgba(16, 185, 129, 0.06)', borderColor: 'rgba(16, 185, 129, 0.25)', color: 'var(--accent-light)' };
}
