import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDashboardData } from '../../hooks/useDashboardData';
import { KribTheme } from '../../theme/theme';
import { HouseHeader } from '../../components/dashboard/HouseHeader';
import { DiningStatusCard } from '../../components/dashboard/DiningStatusCard';
import { AlertsList } from '../../components/dashboard/AlertsList';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { NoHouseholdState } from '../../components/dashboard/NoHouseholdState';

export default function Dashboard() {
    const {
        householdName,
        photoUrl,
        loading,
        alerts,
        eatingCount,
        hasHousehold,
        activityLogs,
        resolveAlert
    } = useDashboardData();

    const router = useRouter();

    if (!loading && !hasHousehold) {
        return <NoHouseholdState />;
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Top 1/3: House Photo */}
            <HouseHeader photoUrl={photoUrl} householdName={householdName} />

            {/* Bottom 2/3: Notifications & Status */}
            <FlatList
                data={[]}
                renderItem={null}
                ListHeaderComponent={
                    <View style={styles.contentSection}>
                        {/* Quick Actions */}
                        <QuickActions />

                        {/* Dining Status Card */}
                        <DiningStatusCard eatingCount={eatingCount} />

                        {/* Activity Feed */}
                        <ActivityFeed activities={activityLogs} loading={loading} />

                        {/* Alerts List */}
                        <AlertsList alerts={alerts} loading={loading} onResolve={resolveAlert} />
                    </View>
                }
                contentContainerStyle={{ flexGrow: 1 }}
            />
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
        paddingBottom: 40,
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
