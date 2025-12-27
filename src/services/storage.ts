import { Platform } from 'react-native';

/**
 * Storage Adapter for Web (localStorage).
 * This file is lazily resolved on Web (default), avoiding imports of native modules.
 */
export const storageAdapter = {
    getItem: async (key: string) => {
        if (typeof localStorage === 'undefined') return null;
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Local storage getItem error:', e);
            return null;
        }
    },

    setItem: async (key: string, value: string) => {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Local storage setItem error:', e);
        }
    },

    removeItem: async (key: string) => {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Local storage removeItem error:', e);
        }
    },
};
