import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, SectionList, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Wallet, FileText, ArrowRight, TrendingUp, RotateCcw } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../../context/ThemeContext';
import { KribTheme } from '../../../theme/theme';
import { useRouter } from 'expo-router';
import { DrawerToggleButton } from '@react-navigation/drawer';
import AddExpenseModal from '../../../components/finances/AddExpenseModal';
import ExpenseDetailModal from '../../../components/finances/ExpenseDetailModal';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FinancesFeed() {
    const router = useRouter();
    const { theme, isDarkMode } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data
    const [expenses, setExpenses] = useState<any[]>([]);
    const [groupedExpenses, setGroupedExpenses] = useState<any[]>([]);
    const [lastSettledDate, setLastSettledDate] = useState<Date | null>(null);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [members, setMembers] = useState<any[]>([]);

    // Modals
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            const { data: member } = await supabase
                .from('household_members')
                .select('household_id, role')
                .eq('user_id', user.id)
                .single();

            if (member) {
                setHouseholdId(member.household_id);
                setUserRole(member.role);

                // Fetch members for the modal dropdown
                const { data: hhMembers } = await supabase
                    .from('household_members')
                    .select('user_id, role, users(username, profile_picture_url)')
                    .eq('household_id', member.household_id);

                if (hhMembers) setMembers(hhMembers);

                // Fetch Expenses
                await fetchExpenses(member.household_id);
            }
        } catch (error) {
            console.error('Error init finances:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchExpenses = async (hhId: string) => {
        try {
            const { data } = await supabase
                .from('expenses')
                .select('*, payer:users(username)')
                .eq('household_id', hhId)
                .order('created_at', { ascending: false });

            if (data) {
                setExpenses(data);
                groupExpenses(data);

                // Calculate last settled date
                const settledExpenses = data.filter(e => e.is_settled && e.settled_at);
                if (settledExpenses.length > 0) {
                    const dates = settledExpenses.map(e => new Date(e.settled_at).getTime());
                    const maxDate = new Date(Math.max(...dates));
                    setLastSettledDate(maxDate);
                } else {
                    setLastSettledDate(null);
                }
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
        }
    };

    const groupExpenses = (data: any[]) => {
        const sections: any[] = [];
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        // 1. Group all items by date (chronological)
        data.forEach(expense => {
            const date = new Date(expense.created_at);
            const dateStr = date.toDateString();

            let title = date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
            if (dateStr === today) title = 'Vandaag';
            else if (dateStr === yesterdayStr) title = 'Gisteren';

            title = title.charAt(0).toUpperCase() + title.slice(1);

            const existingSection = sections.find(s => s.title === title);
            if (existingSection) {
                existingSection.data.push(expense);
            } else {
                sections.push({ title, data: [expense] });
            }
        });

        setGroupedExpenses(sections);
    };

    const handleResetBalance = () => {
        Alert.alert(
            "Balans resetten",
            "Weet je zeker dat je de balans wilt verrekenen? Alle openstaande uitgaven worden gemarkeerd als verrekend.",
            [
                { text: "Nee", style: "cancel" },
                {
                    text: "Ja",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            if (!householdId || !currentUserId) return;

                            // 1. Mark all active expenses as settled
                            const { error: updateError } = await supabase
                                .from('expenses')
                                .update({
                                    is_settled: true,
                                    settled_at: new Date().toISOString()
                                })
                                .eq('household_id', householdId)
                                .eq('is_settled', false);

                            if (updateError) throw updateError;

                            // 2. Get user name for notification
                            const { data: userData } = await supabase
                                .from('users')
                                .select('username')
                                .eq('id', currentUserId)
                                .single();

                            const username = userData?.username || 'Een beheerder';

                            // 3. Create notification
                            const { error: notifError } = await supabase
                                .from('notifications')
                                .insert({
                                    household_id: householdId,
                                    type: 'SYSTEM',
                                    title: 'Huisrekening verrekend',
                                    message: `${username} heeft de huisrekening verrekend.`,
                                    is_resolved: false
                                });

                            if (notifError) {
                                console.error('Error creating notification:', notifError);
                            }

                            // 4. Refresh data
                            await fetchExpenses(householdId);
                            Alert.alert("Success", "De balans is succesvol verrekend.");
                        } catch (err: any) {
                            console.error('Reset error:', err);
                            Alert.alert('Error', 'Kon de balans niet resetten: ' + err.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleRefresh = async () => {
        if (!householdId) return;
        setRefreshing(true);
        await fetchExpenses(householdId);
        setRefreshing(false);
    };

    const handleExpensePress = (item: any) => {
        setSelectedExpense(item);
    };

    const renderExpense = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }, item.is_settled && [styles.cardSettled, { backgroundColor: theme.colors.background }]]}
            activeOpacity={0.7}
            onPress={() => handleExpensePress(item)}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.is_settled ? theme.colors.border : theme.colors.primary + '20' }]}>
                <Wallet size={20} color={item.is_settled ? theme.colors.text.secondary : theme.colors.primary} />
            </View>
            <View style={styles.details}>
                <View style={styles.topRow}>
                    <Text style={[styles.description, { color: theme.colors.text.primary }, item.is_settled && [styles.textSettled, { color: theme.colors.text.secondary }]]} numberOfLines={1}>
                        {item.description}
                    </Text>
                    <Text style={[styles.amount, { color: theme.colors.text.primary }, item.is_settled && [styles.textSettled, { color: theme.colors.text.secondary }]]}>
                        € {item.amount.toFixed(2)}
                    </Text>
                </View>
                <View style={styles.bottomRow}>
                    <Text style={[styles.payer, { color: theme.colors.text.secondary }]}>
                        Betaald door <Text style={{ fontWeight: '600', color: theme.colors.text.secondary }}>{item.payer?.username || 'Onbekend'}</Text>
                    </Text>
                </View>
                {item.receipt_url && (
                    <View style={styles.receiptBadge}>
                        <FileText size={12} color={theme.colors.text.secondary} />
                        <Text style={[styles.receiptText, { color: theme.colors.text.secondary }]}>Bonnetje</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }: { section: any }) => (
        <View>
            {section.showSettledSeparator && (
                <View style={styles.settledSeparator}>
                    <View style={[styles.separatorLine, { backgroundColor: theme.colors.border }]} />
                    <Text style={[styles.separatorText, { color: theme.colors.text.secondary }]}>VERREKEND</Text>
                    <View style={[styles.separatorLine, { backgroundColor: theme.colors.border }]} />
                </View>
            )}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "light"} />

            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <View style={styles.headerTop}>
                    <DrawerToggleButton tintColor={theme.colors.onBackground} />
                    <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Financiën</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        {(userRole === 'ADMIN' || userRole === 'FISCUS') && (
                            <TouchableOpacity onPress={handleResetBalance}>
                                <RotateCcw size={24} color={theme.colors.error} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => router.push('/finances/balance')}>
                            <TrendingUp size={24} color={theme.colors.onBackground} />
                        </TouchableOpacity>
                    </View>
                </View>
                {lastSettledDate && (
                    <Text style={[styles.lastSettledText, { color: theme.colors.text.secondary }]}>
                        Laatst verrekend: {lastSettledDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
            ) : (
                <SectionList
                    sections={groupedExpenses}
                    renderItem={renderExpense}
                    renderSectionHeader={renderSectionHeader}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={[styles.emptyText, { color: theme.colors.onBackground }]}>Nog geen uitgaven. Voeg er een toe!</Text>
                        </View>
                    }
                    stickySectionHeadersEnabled={false}
                />
            )}

            <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary, shadowColor: theme.shadows.floating.shadowColor }]} onPress={() => setModalVisible(true)}>
                <Plus size={32} color={theme.colors.text.inverse} />
            </TouchableOpacity>

            {householdId && currentUserId && (
                <AddExpenseModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onSuccess={() => {
                        setModalVisible(false);
                        handleRefresh();
                    }}
                    householdId={householdId}
                    members={members}
                    currentUserId={currentUserId}
                />
            )}

            <ExpenseDetailModal
                visible={!!selectedExpense}
                onClose={() => setSelectedExpense(null)}
                expense={selectedExpense}
                onUpdate={() => {
                    handleRefresh();
                    setSelectedExpense(null);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
    },
    header: {
        paddingTop: 60, // approximate status bar
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: KribTheme.colors.background,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    lastSettledText: {
        fontSize: 12,
        marginLeft: 48, // Align with title (roughly) or center? Let's align with content flow.
        marginTop: 4,
        opacity: 0.8,
    },
    list: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionHeader: {
        paddingVertical: 8,
        marginBottom: 8,
        marginTop: 16,
    },
    sectionHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: KribTheme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        ...KribTheme.shadows.card,
    },
    cardSettled: {
        opacity: 0.6,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 4,
    },
    details: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    description: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.primary,
        flex: 1,
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    textSettled: {
        textDecorationLine: 'line-through',
        color: '#9CA3AF',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    payer: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    date: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    receiptBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    receiptText: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    empty: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: '#FFFFFF',
        fontStyle: 'italic',
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: KribTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...KribTheme.shadows.floating,
    },
    settledSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
        gap: 12,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    separatorText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 2,
    },
});
