import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get a cached value by key. Returns null if not found or expired.
 */
export const getCache = async (key: string): Promise<any | null> => {
  const { data, error } = await supabase
    .from('cache')
    .select('value, expires_at')
    .eq('key', key)
    .single();

  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) {
    await deleteCache(key);
    return null;
  }
  return data.value;
};

/**
 * Set a cache value with a TTL (in seconds).
 */
export const setCache = async (key: string, value: any, ttlSeconds: number): Promise<void> => {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase
    .from('cache')
    .upsert({ key, value, expires_at: expiresAt });
};

/**
 * Delete a cache entry by key.
 */
export const deleteCache = async (key: string): Promise<void> => {
  await supabase.from('cache').delete().eq('key', key);
}; 