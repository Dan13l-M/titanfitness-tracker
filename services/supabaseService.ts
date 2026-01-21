import { createClient, User } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Initialize Supabase client
const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export { supabase };

// Auth helper functions
export const supabaseSignIn = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const supabaseSignUp = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const supabaseSignOut = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const supabaseResetPassword = async (email: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

export const onSupabaseAuthStateChanged = (callback: (user: User | null) => void) => {
  if (!supabase) {
    callback(null);
    return () => {};
  }
  
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user ?? null);
  });
  
  // Subscribe to auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  
  return () => subscription.unsubscribe();
};

// Database helpers - using user_data table
const DATA_KEYS = [
  'titan_exercises',
  'titan_routines',
  'titan_history',
  'titan_metrics',
  'titan_chats',
  'titan_unit',
  'titan_profile',
  'titan_active_session'
];

export const saveUserData = async (userId: string, key: string, data: any) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('user_data')
    .upsert({
      user_id: userId,
      key: key,
      value: data,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,key'
    });
  
  if (error) throw error;
};

export const loadUserData = async (userId: string): Promise<Record<string, any>> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('user_data')
    .select('key, value')
    .eq('user_id', userId)
    .in('key', DATA_KEYS);
  
  if (error) throw error;
  
  const result: Record<string, any> = {};
  if (data) {
    for (const row of data) {
      result[row.key] = row.value;
    }
  }
  
  return result;
};

export const deleteUserData = async (userId: string, key: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('user_data')
    .delete()
    .eq('user_id', userId)
    .eq('key', key);
  
  if (error) throw error;
};

// Storage helpers for exercise images
export const uploadExerciseImage = async (userId: string, file: File): Promise<string> => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('exercise-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data } = supabase.storage
    .from('exercise-images')
    .getPublicUrl(fileName);
  
  return data.publicUrl;
};

export const deleteExerciseImage = async (imageUrl: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  // Extract path from URL
  const bucketPath = imageUrl.split('/exercise-images/')[1];
  if (!bucketPath) return;
  
  const { error } = await supabase.storage
    .from('exercise-images')
    .remove([bucketPath]);
  
  if (error) throw error;
};

// Delete user account and all associated data
export const deleteAccount = async (userId: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  // First delete all user data from the database
  const { error: dataError } = await supabase
    .from('user_data')
    .delete()
    .eq('user_id', userId);
  
  if (dataError) throw dataError;
  
  // Delete user's images from storage
  try {
    const { data: files } = await supabase.storage
      .from('exercise-images')
      .list(userId);
    
    if (files && files.length > 0) {
      const filePaths = files.map(f => `${userId}/${f.name}`);
      await supabase.storage.from('exercise-images').remove(filePaths);
    }
  } catch (e) {
    console.error('Error deleting user images:', e);
  }
  
  // Note: Deleting the auth user requires admin privileges or the user to be signed in
  // The user will be signed out, and their data is deleted
  // For full account deletion, you would need a Supabase Edge Function with service role key
  await supabase.auth.signOut();
};
