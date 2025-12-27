import { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../context/HouseholdContext';
import { KribTheme } from '../theme/theme';
import LandingPage from '../components/LandingPage';

/**
 * Entry point.
 * NOTE: There is also an index.web.tsx that SHOULD be picked up by Expo Web.
 * However, as a defensive fallback, this file also handles web rendering to ensure
 * the Landing Page is always shown if this file is loaded on web instead.
 */
export default function Index() {
    const { user, household, loading } = useHousehold();


    // Use effect for redirects based on auth state
    useEffect(() => {
        if (loading) return;

        // Web: Strict Landing Page enforcement (Defensive fallback)
        if (Platform.OS === 'web') {
            if (user) {
                if (!household) {
                    router.replace('/(auth)/household-start');
                } else {
                    router.replace('/(app)/dashboard');
                }
            }
            return;
        }

        // Mobile: Strict Redirects
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

    // Web Fallback: Render Landing Page if not logged in
    if (Platform.OS === 'web' && !user) {
        return <LandingPage />;
    }

    // Mobile: Render nothing while redirecting
    return null;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    logo: {
        width: 150,
        height: 80,
        marginBottom: 32,
    },
});
