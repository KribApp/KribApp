import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useHousehold } from '../../context/HouseholdContext';

export default function AuthCallback() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const { refreshHousehold } = useHousehold();

    useEffect(() => {
        if (code) {
            handleAuthCode(code);
        } else {
            // No code, maybe just a redirect?
            setTimeout(() => router.replace('/'), 500);
        }
    }, [code]);

    async function handleAuthCode(authCode: string) {
        try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

            if (error) {
                console.error('Error exchanging code:', error);
                router.replace('/(auth)/login');
                return;
            }

            if (data.session && data.user) {
                // Check if user profile exists
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', data.user.id)
                    .single();

                if (!profile) {
                    // Profile missing, create it manually
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert([
                            {
                                id: data.user.id,
                                email: data.user.email,
                                username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
                            }
                        ]);

                    if (insertError) {
                        console.error('Error creating user profile:', insertError);
                        // Fallback to login if we can't create profile
                        router.replace('/(auth)/login');
                        return;
                    }
                }

                // Success! Profile exists / created.
                // Refresh the household context so it picks up the new user
                await refreshHousehold();

                // Navigate to dashboard
                router.replace('/');
            }
        } catch (err) {
            console.error('Auth callback exception:', err);
            router.replace('/(auth)/login');
        }
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 20 }}>Verifying...</Text>
        </View>
    );
}
