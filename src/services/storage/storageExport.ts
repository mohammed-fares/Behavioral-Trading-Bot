export function exportMemoryJson(memoryCache: Record<string, any>): string {
  return JSON.stringify(memoryCache, null, 2);
}

export function importMemoryJson(
  jsonStr: string,
  onImportSuccess: (parsed: any) => void
): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    onImportSuccess(parsed);
    return true;
  } catch (e) {
    console.error('Failed to import memory JSON:', e);
    return false;
  }
}

export function deduplicateTrades<T extends { id: string }>(trades: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const t of trades) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      result.push(t);
    }
  }
  return result;
}

export function deduplicateDecisions<T extends { id: string }>(decisions: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const d of decisions) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      result.push(d);
    }
  }
  return result;
}
