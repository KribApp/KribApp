import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../services/supabase';

export default function AuthCallback() {
    const { code } = useLocalSearchParams<{ code: string }>();

    useEffect(() => {
        if (code) {
            supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
                if (error) {
                    console.error('Error exchanging code:', error);
                    // Handle error (e.g., show alert, redirect to login)
                    router.replace('/(auth)/login');
                } else {
                    // Success! Session is set.
                    // The auth listener in HouseholdContext/index.tsx will handle the redirect.
                    router.replace('/');
                }
            });
        } else {
            // No code found, maybe just a redirect?
            router.replace('/');
        }
    }, [code]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 20 }}>Verifying...</Text>
        </View>
    );
}
