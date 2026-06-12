export function bodyToHtml(body: string, unsubText: string, includeUnsub: boolean): string {
  const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const BLOCK_RE = /^<(p|div|ul|ol|h[1-6]|table|blockquote|pre)\b/i;
  const bodyHtml = body.split('\n').map(l => {
    const t = l.trim();
    if (!t) return '';
    if (BLOCK_RE.test(t)) return t;
    return `<p style="margin:0 0 12px 0">${t}</p>`;
  }).join('\n');
  const unsubHtml = includeUnsub
    ? escapeText(unsubText)
        .replace(escapeText('{{unsubscribe_link}}'), '<a href="#" style="color:#6b7280">unsubscribe</a>')
        .split('\n').map(l => `<p style="margin:0;font-size:11px;color:#9ca3af">${l}</p>`).join('\n')
    : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.6;max-width:600px;margin:0 auto;padding:24px}
  p{margin:0 0 12px 0} a{color:#2563eb}
  .unsub{border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px}
  </style></head><body>${bodyHtml}${includeUnsub ? `<div class="unsub">${unsubHtml}</div>` : ''}</body></html>`;
}
