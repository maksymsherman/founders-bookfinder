import { Book } from '../types';

/**
 * Heuristic confidence scoring for extracted books.
 * - 1.0: Both title and author valid, title > 3 chars, author > 3 chars
 * - 0.7: Both present but one is short (<=3 chars)
 * - 0.5: Only one present/valid
 * - 0.2: Otherwise
 * - +0.1 if links present, +0.1 if context present (max 1.0)
 */
export const scoreBookConfidence = (book: Book): number => {
  let score = 0;
  const titleValid = !!book.title && book.title.trim().length > 0;
  const authorValid = !!book.author && book.author.trim().length > 0;
  const titleLong = titleValid && book.title.trim().length > 3;
  const authorLong = authorValid && book.author.trim().length > 3;

  if (titleValid && authorValid && titleLong && authorLong) {
    score = 1.0;
  } else if (titleValid && authorValid) {
    score = 0.7;
  } else if (titleValid || authorValid) {
    score = 0.5;
  } else {
    score = 0.2;
  }

  if (book.extractedLinks && book.extractedLinks.length > 0) score += 0.1;
  if (book.context && book.context.length > 0) score += 0.1;
  if (score > 1.0) score = 1.0;
  return score;
}; 