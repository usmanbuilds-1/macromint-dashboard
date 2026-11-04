/**
 * Supabase/PostgREST commonly caps each response. Account exports must
 * explicitly page through every record instead of silently truncating at 1000.
 *
 * Stable sorting is REQUIRED at each callsite: order by primary key or
 * by date plus primary key to avoid nondeterministic page boundaries.
 */
export const EXPORT_PAGE_SIZE = 250;
export const EXPORT_MAX_ROWS_PER_COLLECTION = 200_000;

export type ExportPage<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function fetchEveryExportPage<T>(
  label: string,
  loadPage: (from: number, to: number) => PromiseLike<ExportPage<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const response = await loadPage(offset, offset + EXPORT_PAGE_SIZE - 1);
    if (response.error) {
      throw new Error(`Could not export ${label}: ${response.error.message}`);
    }
    if (!Array.isArray(response.data)) {
      throw new Error(`Could not export ${label}: the server did not return records`);
    }
    all.push(...response.data);
    if (all.length > EXPORT_MAX_ROWS_PER_COLLECTION) {
      throw new Error(`Export too large: ${label}. Contact support for a server export.`);
    }
    if (response.data.length < EXPORT_PAGE_SIZE) return all;
    offset += EXPORT_PAGE_SIZE;
  }
}
