import { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useHousehold } from '../context/HouseholdContext';
import { KribTheme } from '../theme/theme';

/**
 * Mobile Entry Point (index.native.tsx)
 * Matches standard React Native resolution for iOS/Android.
 * Strict redirects to Login or Dashboard.
 */
export default function IndexNative() {
    const { user, household, loading } = useHousehold();

    // Use effect for redirects based on auth state
    useEffect(() => {
        if (loading) return;

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

    // Render nothing while redirecting
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
