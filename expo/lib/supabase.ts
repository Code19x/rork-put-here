import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing! Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const getRedirectUrl = () => {
  if (Platform.OS === 'web') {
    return window.location.origin;
  }
  return Linking.createURL('/');
};

export const getPasswordResetRedirectUrl = () => {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/reset-password`;
  }
  return Linking.createURL('/reset-password');
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
