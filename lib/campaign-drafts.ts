// Local (per-browser) storage for in-progress, not-yet-saved campaign wizard
// sessions. Each unsaved draft gets its own id so starting a new campaign
// never overwrites one left in progress elsewhere.
const KEY = 'campaign_drafts';
const LEGACY_KEY = 'campaign_draft'; // pre-multi-draft single-slot key

export type StoredDraft = { id: string; name: string; savedAt: number; state: Record<string, unknown> };

export function genDraftId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadDrafts(): StoredDraft[] {
  try {
    // One-time migration from the old single-draft key.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.removeItem(LEGACY_KEY);
      const p = JSON.parse(legacy);
      if (p?.name?.trim()) {
        const existing: StoredDraft[] = JSON.parse(localStorage.getItem(KEY) || '[]');
        existing.push({ id: genDraftId(), name: p.name, savedAt: Date.now(), state: p });
        localStorage.setItem(KEY, JSON.stringify(existing));
      }
    }
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveDraft(id: string, state: Record<string, unknown>) {
  try {
    const name = String(state.name || '').trim();
    const drafts = loadDrafts().filter(d => d.id !== id);
    if (name) drafts.push({ id, name, savedAt: Date.now(), state });
    localStorage.setItem(KEY, JSON.stringify(drafts));
  } catch {}
}

export function removeDraft(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadDrafts().filter(d => d.id !== id)));
  } catch {}
}
