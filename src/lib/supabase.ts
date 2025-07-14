import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Define database types based on our schema
export interface Database {
  public: {
    Tables: {
      episodes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          pub_date: string;
          link: string | null;
          guid: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          pub_date: string;
          link?: string | null;
          guid: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          pub_date?: string;
          link?: string | null;
          guid?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          title: string;
          author: string;
          episode_id: string | null;
          episode_title: string;
          episode_date: string;
          extracted_links: string[];
          context: string | null;
          isbn: string | null;
          isbn13: string | null;
          isbn10: string | null;
          publisher: string | null;
          published_date: string | null;
          description: string | null;
          page_count: number | null;
          categories: string[];
          average_rating: number | null;
          ratings_count: number | null;
          language: string | null;
          info_link: string | null;
          cover_image: string | null;
          google_books_id: string | null;
          enhancement_status: 'pending' | 'enhanced' | 'failed' | 'not_found';
          enhancement_date: string | null;
          enhancement_error: string | null;
          date_added: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          author: string;
          episode_id?: string | null;
          episode_title: string;
          episode_date: string;
          extracted_links?: string[];
          context?: string | null;
          isbn?: string | null;
          isbn13?: string | null;
          isbn10?: string | null;
          publisher?: string | null;
          published_date?: string | null;
          description?: string | null;
          page_count?: number | null;
          categories?: string[];
          average_rating?: number | null;
          ratings_count?: number | null;
          language?: string | null;
          info_link?: string | null;
          cover_image?: string | null;
          google_books_id?: string | null;
          enhancement_status?: 'pending' | 'enhanced' | 'failed' | 'not_found';
          enhancement_date?: string | null;
          enhancement_error?: string | null;
          date_added?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string;
          episode_id?: string | null;
          episode_title?: string;
          episode_date?: string;
          extracted_links?: string[];
          context?: string | null;
          isbn?: string | null;
          isbn13?: string | null;
          isbn10?: string | null;
          publisher?: string | null;
          published_date?: string | null;
          description?: string | null;
          page_count?: number | null;
          categories?: string[];
          average_rating?: number | null;
          ratings_count?: number | null;
          language?: string | null;
          info_link?: string | null;
          cover_image?: string | null;
          google_books_id?: string | null;
          enhancement_status?: 'pending' | 'enhanced' | 'failed' | 'not_found';
          enhancement_date?: string | null;
          enhancement_error?: string | null;
          date_added?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      book_extractions: {
        Row: {
          id: string;
          episode_id: string | null;
          raw_response: string | null;
          confidence_score: number | null;
          extraction_date: string;
          llm_model: string | null;
          prompt_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          episode_id?: string | null;
          raw_response?: string | null;
          confidence_score?: number | null;
          extraction_date?: string;
          llm_model?: string | null;
          prompt_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          episode_id?: string | null;
          raw_response?: string | null;
          confidence_score?: number | null;
          extraction_date?: string;
          llm_model?: string | null;
          prompt_version?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      books_with_episodes: {
        Row: {
          id: string;
          title: string;
          author: string;
          episode_id: string | null;
          episode_title: string;
          episode_date: string;
          extracted_links: string[];
          context: string | null;
          isbn: string | null;
          isbn13: string | null;
          isbn10: string | null;
          publisher: string | null;
          published_date: string | null;
          description: string | null;
          page_count: number | null;
          categories: string[];
          average_rating: number | null;
          ratings_count: number | null;
          language: string | null;
          info_link: string | null;
          cover_image: string | null;
          google_books_id: string | null;
          enhancement_status: 'pending' | 'enhanced' | 'failed' | 'not_found';
          enhancement_date: string | null;
          enhancement_error: string | null;
          date_added: string;
          created_at: string;
          updated_at: string;
          episode_title_full: string;
          episode_description: string | null;
          episode_link: string | null;
          episode_pub_date: string;
        };
      };
      enhanced_books: {
        Row: {
          id: string;
          title: string;
          author: string;
          episode_id: string | null;
          episode_title: string;
          episode_date: string;
          extracted_links: string[];
          context: string | null;
          isbn: string | null;
          isbn13: string | null;
          isbn10: string | null;
          publisher: string | null;
          published_date: string | null;
          description: string | null;
          page_count: number | null;
          categories: string[];
          average_rating: number | null;
          ratings_count: number | null;
          language: string | null;
          info_link: string | null;
          cover_image: string | null;
          google_books_id: string | null;
          enhancement_status: 'pending' | 'enhanced' | 'failed' | 'not_found';
          enhancement_date: string | null;
          enhancement_error: string | null;
          date_added: string;
          created_at: string;
          updated_at: string;
        };
      };
      pending_enhancement_books: {
        Row: {
          id: string;
          title: string;
          author: string;
          episode_id: string | null;
          episode_title: string;
          episode_date: string;
          extracted_links: string[];
          context: string | null;
          isbn: string | null;
          isbn13: string | null;
          isbn10: string | null;
          publisher: string | null;
          published_date: string | null;
          description: string | null;
          page_count: number | null;
          categories: string[];
          average_rating: number | null;
          ratings_count: number | null;
          language: string | null;
          info_link: string | null;
          cover_image: string | null;
          google_books_id: string | null;
          enhancement_status: 'pending' | 'enhanced' | 'failed' | 'not_found';
          enhancement_date: string | null;
          enhancement_error: string | null;
          date_added: string;
          created_at: string;
          updated_at: string;
        };
      };
      book_statistics: {
        Row: {
          total_books: number;
          unique_authors: number;
          episodes_with_books: number;
          avg_book_rating: number | null;
          enhanced_books: number;
          pending_enhancement: number;
          failed_enhancement: number;
          not_found_books: number;
        };
      };
    };
  };
}

// Create Supabase client
const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Helper function to test database connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('episodes').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

// Type helpers for better type safety
export type EpisodeRow = Database['public']['Tables']['episodes']['Row'];
export type BookRow = Database['public']['Tables']['books']['Row'];
export type BookInsert = Database['public']['Tables']['books']['Insert'];
export type BookUpdate = Database['public']['Tables']['books']['Update'];
export type BookExtractionRow = Database['public']['Tables']['book_extractions']['Row'];
export type BookExtractionInsert = Database['public']['Tables']['book_extractions']['Insert'];
export type BookWithEpisodeRow = Database['public']['Views']['books_with_episodes']['Row'];
export type BookStatisticsRow = Database['public']['Views']['book_statistics']['Row'];