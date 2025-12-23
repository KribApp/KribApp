import { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../context/HouseholdContext';
import { KribTheme } from '../theme/theme';
import LandingPage from '../components/landing/LandingPage';

/**
 * Entry point that handles initial routing based on auth and household state.
 * Uses HouseholdContext for state (no duplicate auth listener here).
 */
export default function Index() {
    const { user, household, loading } = useHousehold();

    // Use effect for redirects ONLY when we are sure we want to redirect (i.e. logged in)
    useEffect(() => {
        if (loading) return;

        if (user) {
            if (!household) {
                // Logged in but no household - go to household start
                router.replace('/(auth)/household-start');
            } else {
                // Logged in with household - go to dashboard
                router.replace('/(app)/dashboard');
            }
        }
        // If !user, we do NOTHING (stay here and render LandingPage)
        // previously: router.replace('/(auth)/login');
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

    // If we are not logged in (and not loading), show the Landing Page
    if (!user) {
        return <LandingPage />;
    }

    // If user exists, we are redirecting (useEffect handles it), return null or loading
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
