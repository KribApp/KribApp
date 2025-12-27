import { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../context/HouseholdContext';
import { KribTheme } from '../theme/theme';
import LandingPage from '../components/LandingPage';

/**
 * Universal Entry Point (index.tsx)
 * Single entry point for both Web and Mobile platforms.
 * 
 * Logic:
 * - Web: If user is logged in -> Redirect to Dashboard. If NOT logged in -> Render Landing Page.
 * - Mobile: Always redirect to Login or Dashboard (no landing page on mobile).
 */
export default function Index() {
    const { user, household, loading } = useHousehold();

    // Use effect for redirects based on auth state
    useEffect(() => {
        if (loading) return;

        // If user is logged in, redirect regardless of platform
        if (user) {
            if (!household) {
                router.replace('/(auth)/household-start');
            } else {
                router.replace('/(app)/dashboard');
            }
        } else {
            // Not logged in:
            // - On mobile: redirect to login screen
            // - On web: render landing page (handled below)
            if (Platform.OS !== 'web') {
                router.replace('/(auth)/login');
            }
        }
    }, [loading, user, household]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Image
                    source={require('../../assets/krib-logo-v3.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <ActivityIndicator size="large" color={KribTheme.colors.primary} />
            </View>
        );
    }

    // If user is logged in, we are redirecting (return null).
    if (user) return null;

    // On mobile, we are redirecting to login (return null)
    if (Platform.OS !== 'web') return null;

    // If NOT logged in on Web, render Landing Page
    return <LandingPage />;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    logo: {
        width: 150,
        height: 80,
        marginBottom: 32,
    },
});
