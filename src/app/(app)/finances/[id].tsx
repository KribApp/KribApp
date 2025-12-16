import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, DollarSign, ArrowLeft, User, ArrowRight, Camera, FileText } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { KribTheme } from '../../../theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function ListDetail() {
    const { id } = useLocalSearchParams();
    const { theme, isDarkMode } = useTheme();
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
    const [receipt, setReceipt] = useState<string | null>(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

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


    // REDO of function block to include asset state and upload logic properly.

    const [receiptAsset, setReceiptAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

    async function pickReceipt() {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                setReceipt(result.assets[0].uri);
                setReceiptAsset(result.assets[0]);
            }
        } catch (error) {
            Alert.alert('Error', 'Kon afbeelding niet openen.');
        }
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

        let uploadedReceiptUrl = null;

        if (receiptAsset && receiptAsset.base64) {
            const fileName = `${id}/${Date.now()}_receipt.jpg`;
            try {
                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, decode(receiptAsset.base64), {
                        contentType: 'image/jpeg',
                    });

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('receipts')
                        .getPublicUrl(fileName);
                    uploadedReceiptUrl = publicUrl;
                }
            } catch (e) {
                console.error('Receipt upload failed', e);
            }
        }

        // 1. Create Expense
        const { data: expense, error } = await supabase
            .from('expenses')
            .insert([
                {
                    list_id: id,
                    household_id: (await supabase.from('expense_lists').select('household_id').eq('id', id).single()).data?.household_id,
                    payer_user_id: payerId || userId,
                    amount: cost,
                    description: description,
                    receipt_url: uploadedReceiptUrl
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
        setReceipt(null);
        setReceiptAsset(null);
        fetchExpenses(); // Refresh
    }

    const renderExpense = ({ item }: { item: any }) => (
        <View style={[styles.expenseCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.expenseIcon, { backgroundColor: theme.colors.background }]}>
                <Text style={styles.expenseDate}>
                    {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </Text>
            </View>
            <View style={styles.expenseDetails}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.expenseTitle, { color: theme.colors.text.primary }]}>{item.description}</Text>
                    {item.receipt_url && <FileText size={14} color={theme.colors.text.secondary} />}
                </View>
                <Text style={[styles.expensePayer, { color: theme.colors.text.secondary }]}>{item.payer?.username} betaalde</Text>
            </View>
            <Text style={[styles.expenseAmount, { color: theme.colors.text.primary }]}>€ {item.amount.toFixed(2)}</Text>
        </View>
    );

    const renderBalance = ({ item }: { item: any }) => (
        <View style={[styles.balanceRow, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.userRow}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{item.username.substring(0, 1)}</Text>
                </View>
                <Text style={[styles.balanceUsername, { color: theme.colors.text.primary }]}>{item.username}</Text>
            </View>
            <Text style={[
                styles.balanceAmount,
                item.amount > 0 ? { color: theme.colors.success } : item.amount < 0 ? { color: theme.colors.error } : { color: theme.colors.text.secondary }
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
            <View style={[styles.settlementCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.settlementInfo}>
                    <Text style={[styles.settlementText, { color: theme.colors.text.primary }]}>
                        <Text style={{ fontWeight: 'bold' }}>{item.from}</Text> betaalt <Text style={{ fontWeight: 'bold' }}>{item.to}</Text>
                    </Text>
                    <Text style={[styles.settlementAmount, { color: theme.colors.text.primary }]}>€ {item.amount.toFixed(2)}</Text>
                </View>

                {/* Only show button if current user is the one who needs to pay, OR maybe allow anyone to register it? 
                    For MVP, let's allow anyone to register it to be flexible. 
                */}
                <TouchableOpacity
                    style={[styles.settleButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                        if (fromMember && toMember) {
                            settleDebt(fromMember.user_id, toMember.user_id, item.amount);
                        }
                    }}
                >
                    <Text style={[styles.settleButtonText, { color: theme.colors.text.inverse }]}>Verreken</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <StatusBar style={isDarkMode ? "light" : "light"} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.background }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.onBackground} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>{listName}</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.background }]}>
                <TouchableOpacity
                    style={[styles.tab, { borderBottomColor: 'transparent' }, activeTab === 'EXPENSES' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
                    onPress={() => setActiveTab('EXPENSES')}
                >
                    <Text style={[styles.tabText, { color: theme.colors.text.secondary }, activeTab === 'EXPENSES' && [styles.activeTabText, { color: theme.colors.primary }]]}>Uitgaven</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, { borderBottomColor: 'transparent' }, activeTab === 'BALANCE' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
                    onPress={() => setActiveTab('BALANCE')}
                >
                    <Text style={[styles.tabText, { color: theme.colors.text.secondary }, activeTab === 'BALANCE' && [styles.activeTabText, { color: theme.colors.primary }]]}>Balans</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, { borderBottomColor: 'transparent' }, activeTab === 'SETTLE' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
                    onPress={() => setActiveTab('SETTLE')}
                >
                    <Text style={[styles.tabText, { color: theme.colors.text.secondary }, activeTab === 'SETTLE' && [styles.activeTabText, { color: theme.colors.primary }]]}>Verrekenen</Text>
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
                                ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Geen uitgaven gevonden.</Text>}
                            />
                        )}

                        {activeTab === 'BALANCE' && (
                            <FlatList
                                data={balances}
                                renderItem={renderBalance}
                                keyExtractor={item => item.user_id}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Geen balans data.</Text>}
                            />
                        )}

                        {activeTab === 'SETTLE' && (
                            <FlatList
                                data={settlements}
                                renderItem={renderSettlement}
                                keyExtractor={(item, index) => index.toString()}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Iedereen staat quitte!</Text>}
                            />
                        )}
                    </>
                )}
            </View>

            {/* FAB */}
            {activeTab === 'EXPENSES' && (
                <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary, shadowColor: theme.shadows.floating.shadowColor }]} onPress={() => setModalVisible(true)}>
                    <Plus size={32} color={theme.colors.text.inverse} />
                </TouchableOpacity>
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>Nieuwe Uitgave</Text>

                        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Beschrijving</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text.primary }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Wat heb je gekocht?"
                            placeholderTextColor={theme.colors.text.secondary}

                            returnKeyType="next"
                        />

                        <TouchableOpacity
                            style={styles.receiptButton}
                            onPress={pickReceipt}
                        >
                            {receipt ? (
                                <View style={styles.receiptPreview}>
                                    <Image source={{ uri: receipt }} style={styles.receiptImage} />
                                    <Text style={[styles.receiptText, { color: theme.colors.text.secondary }]}>Bonnetje geselecteerd</Text>
                                </View>
                            ) : (
                                <View style={styles.receiptPlaceholder}>
                                    <Camera size={20} color={theme.colors.text.secondary} />
                                    <Text style={[styles.receiptText, { color: theme.colors.text.secondary }]}>Bonnetje toevoegen</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Bedrag (€)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text.primary }]}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.text.secondary}
                            keyboardType="numeric"
                            returnKeyType="done"
                        />

                        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Betaald door</Text>
                        <View style={styles.payerSelector}>
                            {members.map(m => (
                                <TouchableOpacity
                                    key={m.user_id}
                                    style={[styles.payerChip, { backgroundColor: theme.colors.inputBackground, borderColor: 'transparent' }, payerId === m.user_id && [styles.payerChipActive, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]]}
                                    onPress={() => setPayerId(m.user_id)}
                                >
                                    <Text style={[styles.payerChipText, { color: theme.colors.text.secondary }, payerId === m.user_id && [styles.payerChipTextActive, { color: theme.colors.primary, fontWeight: 'bold' }]]}>
                                        {m.users.username}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel, { backgroundColor: theme.colors.text.secondary + '20' }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={[styles.buttonTextCancel, { color: theme.colors.text.primary }]}>Annuleren</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonSave, { backgroundColor: theme.colors.primary }]}
                                onPress={addExpense}
                                disabled={saving}
                            >
                                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.buttonTextSave, { color: theme.colors.text.inverse }]}>Toevoegen</Text>}
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
        backgroundColor: KribTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: KribTheme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: KribTheme.colors.background,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: KribTheme.colors.background,
        paddingHorizontal: 4,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: KribTheme.colors.background,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: KribTheme.colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: KribTheme.colors.text.secondary,
    },
    activeTabText: {
        color: KribTheme.colors.primary,
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
        backgroundColor: KribTheme.colors.surface,
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
        color: KribTheme.colors.text.primary,
    },
    expensePayer: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: KribTheme.colors.surface,
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
        color: KribTheme.colors.text.primary,
    },
    balanceAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    positive: { color: '#10B981' },
    negative: { color: '#EF4444' },
    neutral: { color: '#6B7280' },
    settlementCard: {
        backgroundColor: KribTheme.colors.surface,
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
        color: KribTheme.colors.text.primary,
        marginBottom: 4,
    },
    settlementAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    settleButton: {
        backgroundColor: KribTheme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 12,
    },
    settleButtonText: {
        color: KribTheme.colors.text.inverse,
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
    receiptButton: {
        backgroundColor: KribTheme.colors.background,
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: KribTheme.colors.border,
        borderStyle: 'dashed',
    },
    receiptPlaceholder: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    receiptPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        gap: 12,
        backgroundColor: '#F0F9FF',
    },
    receiptImage: {
        width: 40,
        height: 40,
        borderRadius: 4,
    },
    receiptText: {
        color: KribTheme.colors.text.secondary,
        fontSize: 14,
    },
});
