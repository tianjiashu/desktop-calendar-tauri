// ========== Open event link (F19) ==========

/**
 * Open event URL in external browser.
 * Falls back to clipboard if window.open fails.
 */
export function openEventLink(url?: string): void {
  if (!url) return;

  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(url).catch(() => {
      // Silent fail
    });
  }
}
