import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { KribTheme } from '../../../theme/theme';
import { supabase } from '../../../services/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Wallet } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function BalancePage() {
    const router = useRouter();
    const { theme, isDarkMode } = useTheme();
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<any[]>([]);
    const [totalSpent, setTotalSpent] = useState(0);
    const [lastSettledDate, setLastSettledDate] = useState<Date | null>(null);
    const [householdId, setHouseholdId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    // Real-time subscription for expenses
    useEffect(() => {
        if (!householdId) return;

        const subscription = supabase
            .channel('expenses_balance')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'expenses',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [householdId]);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get Household
            const { data: member } = await supabase
                .from('household_members')
                .select('household_id')
                .eq('user_id', user.id)
                .single();

            if (!member) {
                setLoading(false);
                return;
            }

            setHouseholdId(member.household_id);

            // Fetch Expenses & Shares
            // We need ALL expenses for the household to calculate total balance correctly?? 
            // Or usually "Balances" are lifetime or reset periodically. 
            // For MVP let's assume lifetime or filtering is needed later.
            // We will fetch all.

            const { data: expenses } = await supabase
                .from('expenses')
                .select('id, amount, payer_user_id, is_settled, settled_at')
                .eq('household_id', member.household_id);

            // Fetch members to map names
            const { data: members } = await supabase
                .from('household_members')
                .select('user_id, users(username, profile_picture_url)')
                .eq('household_id', member.household_id);

            if (expenses && members) {
                // Filter for Active Expenses only (for Balance & Total)
                const activeExpenses = expenses.filter(e => !e.is_settled);

                // Calculate Total Spent
                const total = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
                setTotalSpent(total);

                // Calculate Balances
                // 1. Paid
                const paidMap: Record<string, number> = {};
                activeExpenses.forEach(e => {
                    if (e.payer_user_id) {
                        paidMap[e.payer_user_id] = (paidMap[e.payer_user_id] || 0) + e.amount;
                    }
                });

                // 2. Consumed (Shares)
                // We need explicit shares. If we didn't fetch them properly above...
                // Let's fetch shares by IDs
                const expenseIds = activeExpenses.map(e => e.id);
                let allShares: any[] = [];

                if (expenseIds.length > 0) {
                    // Batch fetch might fail if too many. MVP assumes reasonably low expense count or we paginate.
                    // For 'Balance' usually you need aggregated data.
                    // For now, let's just fetch all shares for these expenses.
                    const { data: fetchedShares } = await supabase
                        .from('expense_shares')
                        .select('user_id, owed_amount')
                        .in('expense_id', expenseIds);

                    if (fetchedShares) allShares = fetchedShares;
                }

                const consumedMap: Record<string, number> = {};
                allShares.forEach(s => {
                    consumedMap[s.user_id] = (consumedMap[s.user_id] || 0) + s.owed_amount;
                });

                const balanceList = members.map(m => {
                    const paid = paidMap[m.user_id] || 0;
                    const consumed = consumedMap[m.user_id] || 0;
                    const userData = Array.isArray(m.users) ? m.users[0] : m.users;
                    return {
                        user_id: m.user_id,
                        username: userData?.username || 'Unknown',
                        profile_picture_url: userData?.profile_picture_url,
                        amount: paid - consumed,
                        paid,
                        consumed
                    };
                });

                // Sort: Positive (Credit) first
                balanceList.sort((a, b) => b.amount - a.amount);
                setBalances(balanceList);

                // Match fetch for notifications to find reset events
                const { data: resetNotifications } = await supabase
                    .from('notifications')
                    .select('created_at')
                    .eq('household_id', member.household_id)
                    .eq('title', 'Huisrekening verrekend')
                    .order('created_at', { ascending: false })
                    .limit(1);

                // Calculate Last Settled Date
                const settledExpenses = expenses.filter(e => e.is_settled && e.settled_at);
                const dates = settledExpenses.map(e => new Date(e.settled_at).getTime());

                if (resetNotifications && resetNotifications.length > 0) {
                    dates.push(new Date(resetNotifications[0].created_at).getTime());
                }

                if (dates.length > 0) {
                    const maxDate = new Date(Math.max(...dates));
                    setLastSettledDate(maxDate);
                } else {
                    setLastSettledDate(null);
                }
            }

        } catch (error) {
            console.error('Error calculating balance', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
            <View style={styles.userInfo}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.text.inverse }]}>{item.username.charAt(0)}</Text>
                </View>
                <View>
                    <Text style={[styles.username, { color: theme.colors.text.primary }]}>{item.username}</Text>
                    <Text style={[styles.subtext, { color: theme.colors.text.secondary }]}>Betaald: €{item.paid.toFixed(2)} • Verbruikt: €{item.consumed.toFixed(2)}</Text>
                </View>
            </View>
            <View style={styles.balanceContainer}>
                <Text style={[
                    styles.balanceAmount,
                    item.amount > 0.01 ? { color: theme.colors.success } : item.amount < -0.01 ? { color: theme.colors.error } : { color: theme.colors.text.secondary }
                ]}>
                    {item.amount > 0 ? '+' : ''}€{item.amount.toFixed(2)}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <StatusBar style={isDarkMode ? "light" : "light"} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
                    <ArrowLeft size={24} color={theme.colors.onBackground} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Huis Balans</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={[styles.summary, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.summaryLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>Totaal Uitgegeven</Text>
                <Text style={[styles.summaryAmount, { color: theme.colors.onBackground }]}>€ {totalSpent.toFixed(2)}</Text>
                <Text style={[styles.lastSettledText, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                    Laatst verrekend: {lastSettledDate
                        ? lastSettledDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                        : 'Nog nooit'
                    }
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
            ) : (
                <FlatList
                    data={balances}
                    renderItem={renderItem}
                    keyExtractor={item => item.user_id}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
        backgroundColor: KribTheme.colors.surface,
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    summary: {
        alignItems: 'center',
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    summaryLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
    },
    summaryAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    lastSettledText: {
        fontSize: 12,
        marginTop: 8,
        opacity: 0.8,
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        ...KribTheme.shadows.card,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: KribTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.8,
    },
    avatarText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    subtext: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    balanceContainer: {
        alignItems: 'flex-end',
    },
    balanceAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    positive: {
        color: KribTheme.colors.success,
    },
    negative: {
        color: KribTheme.colors.error,
    },
    neutral: {
        color: KribTheme.colors.text.secondary,
    },
});
