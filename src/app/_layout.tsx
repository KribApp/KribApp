import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { HouseholdProvider } from '../context/HouseholdContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

export default function RootLayout() {
    // Handle deep links for email verification
    useEffect(() => {
        // Handle the initial URL (if app was opened via a link)
        const handleInitialUrl = async () => {
            const url = await Linking.getInitialURL();
            if (url) {
                handleDeepLink(url);
            }
        };
        handleInitialUrl();

        // Listen for incoming links while app is open
        const subscription = Linking.addEventListener('url', (event) => {
            handleDeepLink(event.url);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Extract auth tokens from deep link URL and sign in
    const handleDeepLink = async (url: string) => {
        // Check if this is an auth callback URL
        // Supabase appends tokens as fragment: #access_token=...&refresh_token=...
        if (url.includes('access_token') || url.includes('refresh_token')) {
            const fragmentIndex = url.indexOf('#');
            if (fragmentIndex !== -1) {
                const fragment = url.substring(fragmentIndex + 1);
                const params = new URLSearchParams(fragment);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    console.log('Deep link: Setting session from email verification');
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (error) {
                        console.error('Error setting session from deep link:', error);
                    }
                }
            }
        }
    };

    return (
        <SafeAreaProvider>
            <HouseholdProvider>
                <StatusBar style="auto" />
                <Slot />
            </HouseholdProvider>
        </SafeAreaProvider>
    );
}
