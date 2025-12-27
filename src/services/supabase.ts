import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
      return null;
    }

    // Dynamic require for native ONLY
    try {
      const SecureStore = require('expo-secure-store');
      const result = await SecureStore.getItemAsync(key);
      if (!result) return null;

      try {
        const metadata = JSON.parse(result);
        if (metadata && metadata.__chunked) {
          let combined = '';
          for (let i = 0; i < metadata.chunks; i++) {
            const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
            if (chunk) combined += chunk;
          }
          return combined;
        }
      } catch (e) {
        // Not JSON or not our metadata, treat as normal value
      }

      return result;
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
      return;
    }

    try {
      const SecureStore = require('expo-secure-store');
      const MAX_CHUNK_SIZE = 2000;

      if (value.length <= MAX_CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
        return;
      }

      const chunkCount = Math.ceil(value.length / MAX_CHUNK_SIZE);
      for (let i = 0; i < chunkCount; i++) {
        const chunk = value.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      }

      await SecureStore.setItemAsync(
        key,
        JSON.stringify({ __chunked: true, chunks: chunkCount }),
        {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        }
      );
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },

  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
      return;
    }

    try {
      const SecureStore = require('expo-secure-store');
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        try {
          const metadata = JSON.parse(item);
          if (metadata && metadata.__chunked) {
            for (let i = 0; i < metadata.chunks; i++) {
              await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

