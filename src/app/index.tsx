import { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../context/HouseholdContext';
import { KribTheme } from '../theme/theme';
import LandingPage from '../components/LandingPage';

/**
 * Universal Entry Point (index.tsx)
 * 
 * Logic:
 * - Web (all browsers, including mobile Safari/Chrome): Always show Landing Page
 *   The web version is informational only - users must download the native app.
 * - Native App (iOS/Android): Redirect to Login or Dashboard based on auth state.
 */
export default function Index() {
    const { user, household, loading } = useHousehold();

    // On web: Always show landing page, no redirects needed
    // On native: Handle auth-based redirects
    useEffect(() => {
        // Skip all redirects on web - just show landing page
        if (Platform.OS === 'web') return;

        if (loading) return;

        // Native app only: redirect based on auth state
        if (user) {
            if (!household) {
                router.replace('/(auth)/household-start');
            } else {
                router.replace('/(app)/dashboard');
            }
        } else {
            router.replace('/(auth)/login');
        }
    }, [loading, user, household]);

    // On web: Always show the landing page regardless of auth state
    if (Platform.OS === 'web') {
        return <LandingPage />;
    }

    // Native app: Show loading while checking auth
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

    // Native app: Redirecting, show nothing
    return null;
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
