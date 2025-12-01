import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDashboardData } from '../../hooks/useDashboardData';
import { KribTheme } from '../../theme/theme';
import { HouseHeader } from '../../components/dashboard/HouseHeader';
import { DiningStatusCard } from '../../components/dashboard/DiningStatusCard';
import { AlertsList } from '../../components/dashboard/AlertsList';

export default function Dashboard() {
    const {
        householdName,
        photoUrl,
        loading,
        alerts,
        eatingCount,
        hasHousehold,
        resolveAlert
    } = useDashboardData();

    const router = useRouter();

    if (!loading && !hasHousehold) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <View style={styles.emptyState}>
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Geen huis gevonden</Text>
                        <Text style={styles.emptyText}>Je bent nog geen lid van een huis.</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => router.push('/(auth)/create-household')}
                    >
                        <Text style={styles.createButtonText}>Huis Aanmaken</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Top 1/3: House Photo */}
            <HouseHeader photoUrl={photoUrl} householdName={householdName} />

            {/* Bottom 2/3: Notifications & Status */}
            <View style={styles.contentSection}>
                {/* Dining Status Card */}
                <DiningStatusCard eatingCount={eatingCount} />

                {/* Alerts List */}
                <AlertsList alerts={alerts} loading={loading} onResolve={resolveAlert} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
    },
    contentSection: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
        borderTopLeftRadius: KribTheme.borderRadius.xl,
        borderTopRightRadius: KribTheme.borderRadius.xl,
        marginTop: -24,
        paddingTop: 24,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        ...KribTheme.shadows.card,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: KribTheme.colors.text.secondary,
        marginBottom: 24,
        textAlign: 'center',
    },
    createButton: {
        backgroundColor: KribTheme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
