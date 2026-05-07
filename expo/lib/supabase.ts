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

/**
 * fetch wrapper with timeout and small retry/backoff to make supabase-js
 * resilient to transient mobile network blips that otherwise surface as
 * "AuthRetryableFetchError: Load failed".
 */
const FETCH_TIMEOUT_MS = 20000;
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const resilientFetch: typeof fetch = async (input, init) => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = err;
      const isLast = attempt === MAX_RETRIES;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[supabase fetch] attempt ${attempt + 1} failed:`, message);
      if (isLast) break;
      await sleep(400 * Math.pow(2, attempt));
    }
  }
  throw lastError;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    fetch: resilientFetch,
  },
});
