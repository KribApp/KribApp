import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KribTheme } from '../../theme/theme';

export default function AuthConfirmScreen() {
    const params = useLocalSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const tokenHash = params.token_hash as string;
                const type = params.type as string;

                if (!tokenHash || !type) {
                    // No token provided, redirect to confirm-email anyway
                    router.replace('/confirm-email');
                    return;
                }

                // Verify the OTP token with Supabase
                const { error } = await supabase.auth.verifyOtp({
                    token_hash: tokenHash,
                    type: type as 'email' | 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
                });

                if (error) {
                    console.error('OTP verification error:', error);
                    setErrorMessage(error.message);
                    setStatus('error');
                    // Still redirect after a delay even on error
                    setTimeout(() => {
                        router.replace('/confirm-email');
                    }, 2000);
                    return;
                }

                // Success! Redirect to the confirm-email thank you page
                setStatus('success');
                router.replace('/confirm-email');

            } catch (err) {
                console.error('Verification error:', err);
                setStatus('error');
                setErrorMessage('An unexpected error occurred');
                // Redirect anyway
                setTimeout(() => {
                    router.replace('/confirm-email');
                }, 2000);
            }
        };

        verifyToken();
    }, [params]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {status === 'loading' && (
                    <>
                        <ActivityIndicator size="large" color={KribTheme.colors.primary} />
                        <Text style={styles.text}>Verifying your email...</Text>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <Text style={styles.errorText}>⚠️</Text>
                        <Text style={styles.text}>{errorMessage || 'Verification failed'}</Text>
                        <Text style={styles.subtext}>Redirecting...</Text>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <Text style={styles.successText}>✓</Text>
                        <Text style={styles.text}>Email verified!</Text>
                        <Text style={styles.subtext}>Redirecting...</Text>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    text: {
        fontSize: 18,
        color: '#333',
        marginTop: 20,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
    },
    subtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
    },
    errorText: {
        fontSize: 48,
    },
    successText: {
        fontSize: 48,
        color: '#10B981',
    },
});
