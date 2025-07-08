import Image from 'next/image';
import Link from 'next/link';
import { Book } from '@/types';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const formatPrice = (price?: number, currency = 'USD') => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      {/* Book Cover */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
        {book.coverImage ? (
          <Image
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">No cover available</p>
            </div>
          </div>
        )}
      </div>

      {/* Book Details */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            by {book.author}
          </p>
        </div>

        {/* Episode Info */}
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            From episode: 
            <Link 
              href={`/episodes/${book.episodeId}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
            >
              {book.episodeTitle}
            </Link>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {formatDate(book.episodeDate)}
          </p>
          {book.context && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {book.context}
            </p>
          )}
        </div>

        {/* Price Information */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Price:</span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {book.price?.googleBooks?.price 
                ? formatPrice(book.price.googleBooks.price, book.price.googleBooks.currency)
                : 'Check retailer'
              }
            </span>
          </div>
          {book.price?.lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Price updated: {formatDate(book.price.lastUpdated)}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {book.price?.googleBooks?.url && (
            <a
              href={book.price.googleBooks.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
            >
              View on Google Books
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          
          {book.extractedLinks.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {book.extractedLinks.slice(0, 2).map((link, index) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-1 px-2 rounded text-center transition-colors duration-200"
                >
                  {link.includes('amazon') ? 'Amazon' : 'Other Store'}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard; 