import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../services/supabase';

export default function AuthCallback() {
    const { code } = useLocalSearchParams<{ code: string }>();

    useEffect(() => {
        if (code) {
            supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
                if (error) {
                    console.error('Error exchanging code:', error);
                    router.replace('/(auth)/login');
                } else if (data.session && data.user) {
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

                    // Success! Session is set and profile exists.
                    setTimeout(() => router.replace('/'), 100);
                }
            });
        } else {
            setTimeout(() => router.replace('/'), 100);
        }
    }, [code]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 20 }}>Verifying...</Text>
        </View>
    );
}
