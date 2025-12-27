import { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../context/HouseholdContext';
import { KribTheme } from '../theme/theme';
import LandingPage from '../components/LandingPage';

/**
 * Default Entry Point (index.tsx)
 * Acts as the Web Entry Point because Mobile uses index.native.tsx.
 * 
 * Logic:
 * - If user is logged in -> Redirect to Dashboard.
 * - If user is NOT logged in -> Render Landing Page.
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

    // If NOT logged in, render Landing Page
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
