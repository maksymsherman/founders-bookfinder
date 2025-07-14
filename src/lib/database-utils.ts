import { supabase, EpisodeRow, BookRow, BookInsert, BookUpdate, BookExtractionInsert, BookWithEpisodeRow, BookStatisticsRow } from './supabase';
import { Episode, Book, EnhancedBook } from '@/types';

// Episode database operations
export class EpisodeDatabase {
  static async insertEpisode(episode: Episode): Promise<EpisodeRow | null> {
    const { data, error } = await supabase
      .from('episodes')
      .insert({
        title: episode.title,
        description: episode.description,
        pub_date: episode.pubDate,
        link: episode.link,
        guid: episode.guid,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting episode:', error);
      return null;
    }

    return data;
  }

  static async getEpisodeByGuid(guid: string): Promise<EpisodeRow | null> {
    const { data, error } = await supabase
      .from('episodes')
      .select()
      .eq('guid', guid)
      .single();

    if (error) {
      console.error('Error fetching episode by guid:', error);
      return null;
    }

    return data;
  }

  static async getAllEpisodes(limit?: number): Promise<EpisodeRow[]> {
    let query = supabase
      .from('episodes')
      .select()
      .order('pub_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching episodes:', error);
      return [];
    }

    return data || [];
  }

  static async upsertEpisode(episode: Episode): Promise<EpisodeRow | null> {
    const { data, error } = await supabase
      .from('episodes')
      .upsert({
        title: episode.title,
        description: episode.description,
        pub_date: episode.pubDate,
        link: episode.link,
        guid: episode.guid,
      }, {
        onConflict: 'guid',
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting episode:', error);
      return null;
    }

    return data;
  }
}

// Book database operations
export class BookDatabase {
  static async insertBook(book: Book | EnhancedBook): Promise<BookRow | null> {
    const bookData: BookInsert = {
      title: book.title,
      author: book.author,
      episode_id: book.episodeId,
      episode_title: book.episodeTitle,
      episode_date: book.episodeDate,
      extracted_links: book.extractedLinks,
      context: book.context,
      isbn: book.isbn,
      isbn13: (book as EnhancedBook).isbn13,
      isbn10: (book as EnhancedBook).isbn10,
      publisher: book.publisher,
      published_date: book.publishedDate,
      description: book.description,
      page_count: book.pageCount,
      categories: book.categories,
      average_rating: book.averageRating,
      ratings_count: book.ratingsCount,
      language: book.language,
      info_link: book.infoLink,
      cover_image: book.coverImage,
      google_books_id: (book as EnhancedBook).googleBooksId,
      enhancement_status: (book as EnhancedBook).enhancementStatus || 'pending',
      enhancement_date: (book as EnhancedBook).enhancementDate,
      enhancement_error: (book as EnhancedBook).enhancementError,
      date_added: book.dateAdded,
    };

    const { data, error } = await supabase
      .from('books')
      .insert(bookData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting book:', error);
      return null;
    }

    return data;
  }

  static async updateBook(id: string, updates: BookUpdate): Promise<BookRow | null> {
    const { data, error } = await supabase
      .from('books')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating book:', error);
      return null;
    }

    return data;
  }

  static async getBookById(id: string): Promise<BookRow | null> {
    const { data, error } = await supabase
      .from('books')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching book by id:', error);
      return null;
    }

    return data;
  }

  static async getAllBooks(limit?: number, offset?: number): Promise<BookRow[]> {
    let query = supabase
      .from('books')
      .select()
      .order('date_added', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching books:', error);
      return [];
    }

    return data || [];
  }

  static async getBooksWithEpisodes(limit?: number, offset?: number): Promise<BookWithEpisodeRow[]> {
    let query = supabase
      .from('books_with_episodes')
      .select()
      .order('date_added', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching books with episodes:', error);
      return [];
    }

    return data || [];
  }

  static async getBooksByEpisodeId(episodeId: string): Promise<BookRow[]> {
    const { data, error } = await supabase
      .from('books')
      .select()
      .eq('episode_id', episodeId)
      .order('date_added', { ascending: false });

    if (error) {
      console.error('Error fetching books by episode id:', error);
      return [];
    }

    return data || [];
  }

  static async searchBooks(query: string, limit: number = 50): Promise<BookRow[]> {
    const { data, error } = await supabase
      .from('books')
      .select()
      .or(`title.ilike.%${query}%,author.ilike.%${query}%,description.ilike.%${query}%`)
      .order('date_added', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching books:', error);
      return [];
    }

    return data || [];
  }

  static async getBooksByEnhancementStatus(status: 'pending' | 'enhanced' | 'failed' | 'not_found'): Promise<BookRow[]> {
    const { data, error } = await supabase
      .from('books')
      .select()
      .eq('enhancement_status', status)
      .order('date_added', { ascending: false });

    if (error) {
      console.error('Error fetching books by enhancement status:', error);
      return [];
    }

    return data || [];
  }

  static async deleteBook(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting book:', error);
      return false;
    }

    return true;
  }

  static async getBookStatistics(): Promise<BookStatisticsRow | null> {
    const { data, error } = await supabase
      .from('book_statistics')
      .select()
      .single();

    if (error) {
      console.error('Error fetching book statistics:', error);
      return null;
    }

    return data;
  }
}

// Book extraction database operations
export class BookExtractionDatabase {
  static async insertExtraction(extraction: BookExtractionInsert): Promise<boolean> {
    const { error } = await supabase
      .from('book_extractions')
      .insert(extraction);

    if (error) {
      console.error('Error inserting book extraction:', error);
      return false;
    }

    return true;
  }

  static async getExtractionsByEpisodeId(episodeId: string) {
    const { data, error } = await supabase
      .from('book_extractions')
      .select()
      .eq('episode_id', episodeId)
      .order('extraction_date', { ascending: false });

    if (error) {
      console.error('Error fetching extractions by episode id:', error);
      return [];
    }

    return data || [];
  }
}

// Helper functions to convert between database types and application types
export const convertDatabaseBookToBook = (dbBook: BookRow): Book => {
  return {
    id: dbBook.id,
    title: dbBook.title,
    author: dbBook.author,
    episodeId: dbBook.episode_id || '',
    episodeTitle: dbBook.episode_title,
    episodeDate: dbBook.episode_date,
    extractedLinks: dbBook.extracted_links,
    context: dbBook.context || undefined,
    isbn: dbBook.isbn || undefined,
    isbn13: dbBook.isbn13 || undefined,
    isbn10: dbBook.isbn10 || undefined,
    publisher: dbBook.publisher || undefined,
    publishedDate: dbBook.published_date || undefined,
    description: dbBook.description || undefined,
    pageCount: dbBook.page_count || undefined,
    categories: dbBook.categories || undefined,
    averageRating: dbBook.average_rating || undefined,
    ratingsCount: dbBook.ratings_count || undefined,
    language: dbBook.language || undefined,
    infoLink: dbBook.info_link || undefined,
    coverImage: dbBook.cover_image || undefined,
    dateAdded: dbBook.date_added,
  };
};

export const convertDatabaseBookToEnhancedBook = (dbBook: BookRow): EnhancedBook => {
  return {
    ...convertDatabaseBookToBook(dbBook),
    googleBooksId: dbBook.google_books_id || undefined,
    enhancementStatus: dbBook.enhancement_status,
    enhancementDate: dbBook.enhancement_date || undefined,
    enhancementError: dbBook.enhancement_error || undefined,
  };
};

export const convertDatabaseEpisodeToEpisode = (dbEpisode: EpisodeRow): Episode => {
  return {
    id: dbEpisode.id,
    title: dbEpisode.title,
    description: dbEpisode.description || '',
    pubDate: dbEpisode.pub_date,
    link: dbEpisode.link || '',
    guid: dbEpisode.guid,
  };
};