import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../context/HouseholdContext';
import { KribTheme } from '../theme/theme';
import LandingPage from '../components/LandingPage';

/**
 * Web Entry Point
 * Handles initial routing for web users.
 * - If authenticated: specific redirects based on household state.
 * - If NOT authenticated: Renders the Landing Page.
 */
export default function IndexWeb() {
    const { user, household, loading } = useHousehold();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (user) {
                // Determine redirect path but don't redirect yet to prevent flickering if we want to show loading
                // Actually for web, we can just redirect.
                if (!household) {
                    router.replace('/(auth)/household-start');
                } else {
                    router.replace('/(app)/dashboard');
                }
            } else {
                // Stay on index to show Landing Page
                setIsReady(true);
            }
        }
    }, [loading, user, household]);

    // Show loading screen while checking auth state
    // Unless we are already determined to be logged out (isReady)
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

    // If user is logged in, useEffect handles redirect.
    // If user is NOT logged in, we render the Landing Page.
    // We can render null if user is logged in to avoid flash of content before redirect, 
    // although useEffect usually fires quickly.

    if (user) {
        return null; // Redirecting...
    }

    return <LandingPage />;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // Clean white for web loading
    },
    logo: {
        width: 150,
        height: 80,
        marginBottom: 32,
    },
});
