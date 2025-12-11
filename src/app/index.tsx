import { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../context/HouseholdContext';
import { KribTheme } from '../theme/theme';

/**
 * Entry point that handles initial routing based on auth and household state.
 * Uses HouseholdContext for state (no duplicate auth listener here).
 */
export default function Index() {
    const { user, household, loading } = useHousehold();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            // Not logged in - go to login
            router.replace('/(auth)/login');
        } else if (!household) {
            // Logged in but no household - go to household start
            router.replace('/(auth)/household-start');
        } else {
            // Logged in with household - go to dashboard
            router.replace('/(app)/dashboard');
        }
    }, [loading, user, household]);

    // Always show loading screen while determining state
    return (
        <View style={styles.container}>
            <Image
                source={require('../../assets/krib-logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />
            <ActivityIndicator size="large" color={KribTheme.colors.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 32,
    },
});
