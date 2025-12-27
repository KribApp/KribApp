import * as SecureStore from 'expo-secure-store';

/**
 * Storage Adapter for Native (SecureStore).
 * Includes chunking logic for large values (max 2048 bytes per key in some OS versions).
 */
export const storageAdapter = {
    getItem: async (key: string) => {
        try {
            const result = await SecureStore.getItemAsync(key);
            if (!result) return null;

            // Check if it's a chunked value
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
        try {
            const MAX_CHUNK_SIZE = 2000;

            // If small enough, store directly
            if (value.length <= MAX_CHUNK_SIZE) {
                await SecureStore.setItemAsync(key, value, {
                    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
                });
                return;
            }

            // If too large, chunk it
            const chunkCount = Math.ceil(value.length / MAX_CHUNK_SIZE);
            for (let i = 0; i < chunkCount; i++) {
                const chunk = value.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
                await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk, {
                    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
                });
            }

            // Store metadata in the main key
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
        try {
            // Check if we need to remove chunks
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
