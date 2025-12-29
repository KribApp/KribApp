import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';

/**
 * Auth Layout
 * 
 * On web: Redirect to landing page (auth is only available in native app)
 * On native: Show auth screens normally
 */
export default function AuthLayout() {
    useEffect(() => {
        // Block web users from accessing auth screens
        // They should download the native app instead
        if (Platform.OS === 'web') {
            router.replace('/');
        }
    }, []);

    // On web, redirect to landing page
    if (Platform.OS === 'web') {
        return null;
    }

    // On native, show auth screens
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="household-start" />
            <Stack.Screen name="create-household" />
            <Stack.Screen name="join-household" />
            <Stack.Screen name="callback" />
        </Stack>
    );
}
