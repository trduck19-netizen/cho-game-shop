/**
 * Utility functions to manage Recent Searches in LocalStorage
 * Synchronizes across multiple SearchAutocomplete instances (Hero and Floating bar)
 */

const RECENT_SEARCHES_KEY = 'wcg_recent_searches';
export const MAX_RECENT_SEARCHES = 5;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, MAX_RECENT_SEARCHES);
      }
    }
  } catch {}
  return [];
}

export function saveRecentSearch(term: string): string[] {
  if (typeof window === 'undefined') return [];
  const clean = term.trim();
  if (!clean || clean.length < 2) return getRecentSearches();

  const current = getRecentSearches();
  const updated = [clean, ...current.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
    0,
    MAX_RECENT_SEARCHES
  );

  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('wcg_recent_searches_updated', { detail: updated }));
  } catch {}

  return updated;
}

export function removeRecentSearch(term: string): string[] {
  if (typeof window === 'undefined') return [];
  const current = getRecentSearches();
  const updated = current.filter((t) => t.toLowerCase() !== term.toLowerCase());

  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('wcg_recent_searches_updated', { detail: updated }));
  } catch {}

  return updated;
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    window.dispatchEvent(new CustomEvent('wcg_recent_searches_updated', { detail: [] }));
  } catch {}
}
