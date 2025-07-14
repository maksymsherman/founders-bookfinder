import { Book, BookValidationResult } from '../types';

// Validation utility for Book data
export const validateBookData = (book: Book): BookValidationResult => {
  const errors: string[] = [];

  // Title validation
  if (!book.title || typeof book.title !== 'string' || book.title.trim().length === 0) {
    errors.push('Book title is required.');
  } else if (book.title.trim().length < 2) {
    errors.push('Book title is too short.');
  } else if (book.title.trim().length > 200) {
    errors.push('Book title is too long.');
  } else if (/^[^a-zA-Z0-9]+$/.test(book.title.trim())) {
    errors.push('Book title must contain letters or numbers.');
  }

  // Author validation
  if (!book.author || typeof book.author !== 'string' || book.author.trim().length === 0) {
    errors.push('Author name is required.');
  } else if (book.author.trim().length < 2) {
    errors.push('Author name is too short.');
  } else if (book.author.trim().length > 100) {
    errors.push('Author name is too long.');
  } else if (/^[^a-zA-Z0-9]+$/.test(book.author.trim())) {
    errors.push('Author name must contain letters or numbers.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Example usage/test cases (to be removed or moved to tests in production)
/*
const testBooks: Book[] = [
  { id: '1', title: '', author: '', episodeId: '', episodeTitle: '', episodeDate: '', extractedLinks: [], dateAdded: '' },
  { id: '2', title: 'A', author: 'B', episodeId: '', episodeTitle: '', episodeDate: '', extractedLinks: [], dateAdded: '' },
  { id: '3', title: 'Valid Book', author: 'Valid Author', episodeId: '', episodeTitle: '', episodeDate: '', extractedLinks: [], dateAdded: '' },
  { id: '4', title: '!!!', author: '???', episodeId: '', episodeTitle: '', episodeDate: '', extractedLinks: [], dateAdded: '' },
];
testBooks.forEach(book => {
  console.log(book.title, book.author, validateBookData(book));
});
*/ 