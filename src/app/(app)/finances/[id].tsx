import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, DollarSign, ArrowLeft, User, ArrowRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KribTheme } from '../../../theme/theme';

export default function ListDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [listName, setListName] = useState('Laden...');
    const [expenses, setExpenses] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [settlements, setSettlements] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'EXPENSES' | 'BALANCE' | 'SETTLE'>('EXPENSES');
    const [userId, setUserId] = useState<string | null>(null);

    // New Expense Form
    const [modalVisible, setModalVisible] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [payerId, setPayerId] = useState<string | null>(null);

    useEffect(() => {
        fetchUser();
        fetchListDetails();
    }, [id]);

    async function fetchUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            setPayerId(user.id);
        }
    }

    async function fetchListDetails() {
        if (!id) return;

        // 1. Get List Info
        const { data: list } = await supabase
            .from('expense_lists')
            .select('name, household_id')
            .eq('id', id)
            .single();

        if (list) {
            setListName(list.name);
            fetchMembers(list.household_id);
        }

        // 2. Get Expenses
        fetchExpenses();
    }

    async function fetchMembers(householdId: string) {
        const { data } = await supabase
            .from('household_members')
            .select('user_id, users(username, profile_picture_url)')
            .eq('household_id', householdId);

        if (data) {
            setMembers(data);
        }
    }

    async function fetchExpenses() {
        const { data } = await supabase
            .from('expenses')
            .select('*, payer:users(username)')
            .eq('list_id', id)
            .order('created_at', { ascending: false });

        if (data) {
            setExpenses(data);
            calculateBalances(data);
        }
        setLoading(false);
    }

    async function calculateBalances(currentExpenses: any[]) {
        // Fetch all shares for these expenses
        const expenseIds = currentExpenses.map(e => e.id);
        if (expenseIds.length === 0) {
            setBalances([]);
            setSettlements([]);
            return;
        }

        const { data: shares } = await supabase
            .from('expense_shares')
            .select('*')
            .in('expense_id', expenseIds);

        if (!shares) return;

        // Calculate net balance per user
        const balanceMap: Record<string, number> = {};

        // Initialize 0 for all known members (if we had them in state, but we might not have fetched them yet fully in this function scope if called early)
        // Better to rely on the shares and expenses data

        // + Credit for paying
        currentExpenses.forEach(exp => {
            balanceMap[exp.payer_user_id] = (balanceMap[exp.payer_user_id] || 0) + exp.amount;
        });

        // - Debit for owing
        shares.forEach(share => {
            balanceMap[share.user_id] = (balanceMap[share.user_id] || 0) - share.owed_amount;
        });

        const balanceList = Object.keys(balanceMap).map(uid => {
            const member = members.find(m => m.user_id === uid);
            return {
                user_id: uid,
                username: member?.users?.username || 'Unknown',
                amount: balanceMap[uid]
            };
        });

        setBalances(balanceList);
        calculateSettlements(balanceList);
    }

    function calculateSettlements(balanceList: any[]) {
        let debtors = balanceList.filter(b => b.amount < -0.01).sort((a, b) => a.amount - b.amount);
        let creditors = balanceList.filter(b => b.amount > 0.01).sort((a, b) => b.amount - a.amount);

        const results = [];

        let i = 0;
        let j = 0;

        while (i < debtors.length && j < creditors.length) {
            let debtor = debtors[i];
            let creditor = creditors[j];

            let amount = Math.min(Math.abs(debtor.amount), creditor.amount);

            results.push({
                from: debtor.username,
                to: creditor.username,
                amount: amount
            });

            debtor.amount += amount;
            creditor.amount -= amount;

            if (Math.abs(debtor.amount) < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        setSettlements(results);
    }

    async function addExpense() {
        if (!amount || !description || !id || !userId) return;

        setSaving(true);
        const cost = parseFloat(amount.replace(',', '.'));

        if (isNaN(cost)) {
            Alert.alert('Error', 'Ongeldig bedrag.');
            setSaving(false);
            return;
        }

        // 1. Create Expense
        const { data: expense, error } = await supabase
            .from('expenses')
            .insert([
                {
                    list_id: id,
                    // We need household_id for RLS policies on expenses table if we didn't update them...
                    // Wait, expenses table has household_id NOT NULL. We need to fetch it or pass it.
                    // Let's fetch it from the list details we have.
                    household_id: (await supabase.from('expense_lists').select('household_id').eq('id', id).single()).data?.household_id,
                    payer_user_id: payerId || userId,
                    amount: cost,
                    description: description,
                }
            ])
            .select()
            .single();

        if (error) {
            Alert.alert('Error', 'Kon uitgave niet toevoegen: ' + error.message);
            setSaving(false);
            return;
        }

        // 2. Create Shares (Split equally among all members for MVP)
        if (members.length > 0) {
            const shareAmount = cost / members.length;
            const shares = members.map(m => ({
                expense_id: expense.id,
                user_id: m.user_id,
                owed_amount: shareAmount
            }));

            await supabase.from('expense_shares').insert(shares);
        }

        setSaving(false);
        setModalVisible(false);
        setAmount('');
        setDescription('');
        fetchExpenses(); // Refresh
    }

    const renderExpense = ({ item }: { item: any }) => (
        <View style={styles.expenseCard}>
            <View style={styles.expenseIcon}>
                <Text style={styles.expenseDate}>
                    {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </Text>
            </View>
            <View style={styles.expenseDetails}>
                <Text style={styles.expenseTitle}>{item.description}</Text>
                <Text style={styles.expensePayer}>{item.payer?.username} betaalde</Text>
            </View>
            <Text style={styles.expenseAmount}>€ {item.amount.toFixed(2)}</Text>
        </View>
    );

    const renderBalance = ({ item }: { item: any }) => (
        <View style={styles.balanceRow}>
            <View style={styles.userRow}>
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{item.username.substring(0, 1)}</Text>
                </View>
                <Text style={styles.balanceUsername}>{item.username}</Text>
            </View>
            <Text style={[
                styles.balanceAmount,
                item.amount > 0 ? styles.positive : item.amount < 0 ? styles.negative : styles.neutral
            ]}>
                {item.amount > 0 ? '+' : ''}€ {item.amount.toFixed(2)}
            </Text>
        </View>
    );

    async function settleDebt(fromUser: string, toUser: string, amount: number) {
        if (!id || !userId) return;

        // Optimistic update or loading state could be added here
        Alert.alert(
            'Verrekenen',
            `Wil je een betaling van €${amount.toFixed(2)} registreren?`,
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Bevestigen',
                    onPress: async () => {
                        setLoading(true);

                        // 1. Create Expense (Settlement)
                        // "fromUser" pays "toUser"
                        // So "fromUser" is payer.
                        // "toUser" is the one who "consumed" this money (received it).
                        // In our model: Payer gets +Credit. Consumer gets -Debit.
                        // So if A owes B 10. A pays B 10.
                        // A is Payer (+10). B is Consumer (-10).
                        // Net for A: -10 (debt) + 10 (payment) = 0.
                        // Net for B: +10 (credit) - 10 (received) = 0.

                        const { data: expense, error } = await supabase
                            .from('expenses')
                            .insert([
                                {
                                    list_id: id,
                                    household_id: (await supabase.from('expense_lists').select('household_id').eq('id', id).single()).data?.household_id,
                                    payer_user_id: fromUser, // The debtor pays
                                    amount: amount,
                                    description: 'Verrekening',
                                }
                            ])
                            .select()
                            .single();

                        if (error) {
                            Alert.alert('Error', 'Kon verrekening niet verwerken.');
                            setLoading(false);
                            return;
                        }

                        // 2. Create Share
                        // The creditor "consumes" this amount (receives it)
                        await supabase.from('expense_shares').insert([
                            {
                                expense_id: expense.id,
                                user_id: toUser, // The creditor
                                owed_amount: amount
                            }
                        ]);

                        fetchExpenses(); // Reload everything
                    }
                }
            ]
        );
    }

    const renderSettlement = ({ item }: { item: any }) => {
        // Find user IDs for the names (a bit inefficient but works for MVP)
        const fromMember = members.find(m => m.users.username === item.from);
        const toMember = members.find(m => m.users.username === item.to);

        return (
            <View style={styles.settlementCard}>
                <View style={styles.settlementInfo}>
                    <Text style={styles.settlementText}>
                        <Text style={{ fontWeight: 'bold' }}>{item.from}</Text> betaalt <Text style={{ fontWeight: 'bold' }}>{item.to}</Text>
                    </Text>
                    <Text style={styles.settlementAmount}>€ {item.amount.toFixed(2)}</Text>
                </View>

                {/* Only show button if current user is the one who needs to pay, OR maybe allow anyone to register it? 
                    For MVP, let's allow anyone to register it to be flexible. 
                */}
                <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() => {
                        if (fromMember && toMember) {
                            settleDebt(fromMember.user_id, toMember.user_id, item.amount);
                        }
                    }}
                >
                    <Text style={styles.settleButtonText}>Verreken</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{listName}</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'EXPENSES' && styles.activeTab]}
                    onPress={() => setActiveTab('EXPENSES')}
                >
                    <Text style={[styles.tabText, activeTab === 'EXPENSES' && styles.activeTabText]}>Uitgaven</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'BALANCE' && styles.activeTab]}
                    onPress={() => setActiveTab('BALANCE')}
                >
                    <Text style={[styles.tabText, activeTab === 'BALANCE' && styles.activeTabText]}>Balans</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'SETTLE' && styles.activeTab]}
                    onPress={() => setActiveTab('SETTLE')}
                >
                    <Text style={[styles.tabText, activeTab === 'SETTLE' && styles.activeTabText]}>Verrekenen</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <>
                        {activeTab === 'EXPENSES' && (
                            <FlatList
                                data={expenses}
                                renderItem={renderExpense}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={<Text style={styles.emptyText}>Geen uitgaven gevonden.</Text>}
                            />
                        )}

                        {activeTab === 'BALANCE' && (
                            <FlatList
                                data={balances}
                                renderItem={renderBalance}
                                keyExtractor={item => item.user_id}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={<Text style={styles.emptyText}>Geen balans data.</Text>}
                            />
                        )}

                        {activeTab === 'SETTLE' && (
                            <FlatList
                                data={settlements}
                                renderItem={renderSettlement}
                                keyExtractor={(item, index) => index.toString()}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={<Text style={styles.emptyText}>Iedereen staat quitte!</Text>}
                            />
                        )}
                    </>
                )}
            </View>

            {/* FAB */}
            {activeTab === 'EXPENSES' && (
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Plus size={32} color="#FFFFFF" />
                </TouchableOpacity>
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nieuwe Uitgave</Text>

                        <Text style={styles.label}>Beschrijving</Text>
                        <TextInput
                            style={styles.input}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Wat heb je gekocht?"
                            placeholderTextColor={KribTheme.colors.text.secondary}
                            returnKeyType="next"
                        />

                        <Text style={styles.label}>Bedrag (€)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            placeholderTextColor={KribTheme.colors.text.secondary}
                            keyboardType="numeric"
                            returnKeyType="done"
                        />

                        <Text style={styles.label}>Betaald door</Text>
                        <View style={styles.payerSelector}>
                            {members.map(m => (
                                <TouchableOpacity
                                    key={m.user_id}
                                    style={[styles.payerChip, payerId === m.user_id && styles.payerChipActive]}
                                    onPress={() => setPayerId(m.user_id)}
                                >
                                    <Text style={[styles.payerChipText, payerId === m.user_id && styles.payerChipTextActive]}>
                                        {m.users.username}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonTextCancel}>Annuleren</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonSave]}
                                onPress={addExpense}
                                disabled={saving}
                            >
                                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonTextSave}>Toevoegen</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 4,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#2563EB',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#2563EB',
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    emptyText: {
        textAlign: 'center',
        color: '#6B7280',
        marginTop: 40,
        fontStyle: 'italic',
    },
    expenseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    expenseIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    expenseDate: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#6B7280',
        textAlign: 'center',
    },
    expenseDetails: {
        flex: 1,
    },
    expenseTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    expensePayer: {
        fontSize: 12,
        color: '#6B7280',
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#1E40AF',
        fontWeight: 'bold',
    },
    balanceUsername: {
        fontSize: 16,
        color: '#111827',
    },
    balanceAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    positive: { color: '#10B981' },
    negative: { color: '#EF4444' },
    neutral: { color: '#6B7280' },
    settlementCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settlementInfo: {
        flex: 1,
    },
    settlementText: {
        fontSize: 16,
        color: '#374151',
        marginBottom: 4,
    },
    settlementAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    settleButton: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 12,
    },
    settleButtonText: {
        color: '#2563EB',
        fontWeight: '600',
        fontSize: 14,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 24,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    payerSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    payerChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    payerChipActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#2563EB',
    },
    payerChipText: {
        fontSize: 14,
        color: '#4B5563',
    },
    payerChipTextActive: {
        color: '#2563EB',
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonCancel: {
        backgroundColor: '#F3F4F6',
    },
    buttonSave: {
        backgroundColor: '#2563EB',
    },
    buttonTextCancel: {
        color: '#4B5563',
        fontWeight: '600',
    },
    buttonTextSave: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
