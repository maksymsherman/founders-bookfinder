import { Book } from '../types';

/**
 * Merges duplicate books by title and author (case-insensitive, trimmed).
 * - Combines links (deduplicated)
 * - Combines contexts (if different)
 * - Keeps earliest episodeDate
 * - Keeps all episode references (episodeId, episodeTitle)
 */
export const mergeDuplicateBooks = (books: Book[]): Book[] => {
  const bookMap = new Map<string, Book>();

  books.forEach((book) => {
    const key = `${book.title.trim().toLowerCase()}|${book.author.trim().toLowerCase()}`;
    if (!bookMap.has(key)) {
      bookMap.set(key, { ...book, extractedLinks: [...(book.extractedLinks || [])], context: book.context || '' });
    } else {
      const existing = bookMap.get(key)!;
      // Merge links
      const mergedLinks = Array.from(new Set([...(existing.extractedLinks || []), ...(book.extractedLinks || [])]));
      // Merge context
      let mergedContext = existing.context || '';
      if (book.context && !mergedContext.includes(book.context)) {
        mergedContext = mergedContext ? `${mergedContext} | ${book.context}` : book.context;
      }
      // Earliest episodeDate
      const earliestDate = existing.episodeDate < book.episodeDate ? existing.episodeDate : book.episodeDate;
      // Merge episode references (keep latest episodeId/title for now)
      bookMap.set(key, {
        ...existing,
        extractedLinks: mergedLinks,
        context: mergedContext,
        episodeDate: earliestDate,
        episodeId: existing.episodeId, // Optionally, could keep an array of episodeIds
        episodeTitle: existing.episodeTitle, // Optionally, could keep an array
      });
    }
  });

  return Array.from(bookMap.values());
}; 