import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Image, ScrollView, RefreshControl, Alert } from 'react-native';
import { X, FileText, User, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';

interface ExpenseDetailModalProps {
    visible: boolean;
    onClose: () => void;
    expense: any; // Using any for now to be flexible, but should match Expense type
    onUpdate?: () => void;
}

export default function ExpenseDetailModal({ visible, onClose, expense, onUpdate }: ExpenseDetailModalProps) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [shares, setShares] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [fullExpense, setFullExpense] = useState<any>(null);

    const activeExpense = fullExpense || expense;

    useEffect(() => {
        if (visible && expense) {
            fetchDetails();
        }
    }, [visible, expense]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // 0. Fetch fresh Expense (to ensure receipt_url is up to date)
            const { data: expenseData } = await supabase
                .from('expenses')
                .select('*')
                .eq('id', expense.id)
                .single();

            if (expenseData) setFullExpense(expenseData);

            // 1. Fetch Shares
            const { data: sharesData } = await supabase
                .from('expense_shares')
                .select('*')
                .eq('expense_id', expense.id);

            // 2. Fetch Members (to map names to user_ids)
            const { data: membersData } = await supabase
                .from('household_members')
                .select('user_id, users(username, profile_picture_url)')
                .eq('household_id', expense.household_id);

            if (sharesData) setShares(sharesData);
            if (membersData) setMembers(membersData);

        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!expense) return null;

    const renderImpactList = () => {
        if (!members.length) return null;

        return members.map(member => {
            const userData = Array.isArray(member.users) ? member.users[0] : member.users;
            const isPayer = member.user_id === expense.payer_user_id;

            // Find share
            const share = shares.find(s => s.user_id === member.user_id);

            const consumedAmount = share ? share.owed_amount : 0;
            const paidAmount = isPayer ? expense.amount : 0;

            // Calculate net impact
            const netImpact = paidAmount - consumedAmount;

            // Show EVERYTHING - user wants to see red/green balance changes
            // Even if 0, it clarifies they were part of it (or deliberately 0)

            const isPositive = netImpact > 0.001;
            const isNegative = netImpact < -0.001;

            // Format color: Green for receive, Red for pay, Gray for neutral (0)
            let color = theme.colors.text.secondary;
            if (isPositive) color = theme.colors.success;
            if (isNegative) color = theme.colors.error;

            return (
                <View key={member.user_id} style={styles.impactRow}>
                    <View style={styles.userContainer}>
                        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                            <Text style={[styles.avatarText, { color: theme.colors.text.inverse }]}>
                                {userData?.username?.charAt(0) || '?'}
                            </Text>
                        </View>
                        <Text style={[styles.username, { color: theme.colors.text.primary }]}>{userData?.username || 'Onbekend'}</Text>
                        {isPayer && <Text style={[styles.payerBadge, { color: theme.colors.text.secondary }]}> (Betaald)</Text>}
                    </View>
                    <Text style={[styles.impactAmount, { color }]}>
                        {isPositive ? '+' : ''}€ {netImpact.toFixed(2)}
                    </Text>
                </View>
            );
        });
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Details</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.text.secondary + '20' }]}>
                            <X size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Main Info */}
                        <View style={styles.mainInfo}>
                            <Text style={[styles.description, { color: theme.colors.text.primary }]}>{expense.description}</Text>
                            <Text style={[styles.amount, { color: theme.colors.text.primary }]}>€ {expense.amount.toFixed(2)}</Text>
                            <Text style={[styles.date, { color: theme.colors.text.secondary }]}>
                                {new Date(expense.created_at).toLocaleDateString('nl-NL', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                        {/* Impact List */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Effect op balans</Text>
                        {loading ? (
                            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
                        ) : (
                            <View style={[styles.impactList, { backgroundColor: theme.colors.inputBackground }]}>
                                {renderImpactList()}
                            </View>
                        )}

                        {/* Receipt */}
                        {activeExpense.receipt_url && (
                            <>
                                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                                <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Bonnetje</Text>
                                <View style={[styles.receiptContainer, { backgroundColor: theme.colors.inputBackground }]}>
                                    <Image
                                        source={{ uri: activeExpense.receipt_url }}
                                        style={styles.receiptImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </>
                        )}

                        {/* Delete Button */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.deleteButton, { backgroundColor: theme.colors.error + '15' }]}
                                onPress={() => {
                                    Alert.alert(
                                        'Uitgave verwijderen',
                                        'Weet je zeker dat je deze uitgave wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
                                        [
                                            { text: 'Annuleren', style: 'cancel' },
                                            {
                                                text: 'Verwijderen',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    try {
                                                        const { data: { user } } = await supabase.auth.getUser();
                                                        console.log("Debug: Current User ID:", user?.id);
                                                        console.log("Debug: Expense Payer ID:", expense.payer_user_id);

                                                        console.log("Debug: Attempting soft delete for expense:", expense.id);
                                                        const { data, error } = await supabase
                                                            .from('expenses')
                                                            .update({
                                                                is_settled: true,
                                                                settled_at: new Date().toISOString()
                                                            })
                                                            .eq('id', expense.id)
                                                            .select(); // Select to verifies return

                                                        console.log("Debug: Soft delete result:", { data, error });

                                                        if (error) throw error;
                                                        if (onUpdate) {
                                                            console.log("Debug: Calling onUpdate...");
                                                            onUpdate();
                                                        }
                                                        onClose();
                                                    } catch (err) {
                                                        console.error("Debug: Soft delete error:", err);
                                                        Alert.alert('Fout', 'Kon uitgave niet verwijderen.');
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Trash2 size={20} color={theme.colors.error} style={{ marginRight: 8 }} />
                                <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>Uitgave verwijderen</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View >
        </Modal >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%', // Increased height
        paddingTop: 24,
        // Shadows would be dynamic or passed but here we can rely on elevation or basic shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
        borderRadius: 12,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    mainInfo: {
        alignItems: 'center',
        marginBottom: 24,
    },
    description: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    amount: {
        fontSize: 32,
        fontWeight: '900',
    },
    date: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        marginVertical: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    impactList: {
        borderRadius: 16,
        padding: 16,
    },
    impactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontWeight: 'bold',
    },
    username: {
        fontSize: 16,
        fontWeight: '500',
    },
    payerBadge: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    impactAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    receiptContainer: {
        borderRadius: 16,
        padding: 8,
        height: 300,
        marginBottom: 40,
    },
    receiptImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    footer: {
        marginTop: 24,
        marginBottom: 24,
    },
    deleteButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    deleteButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
    }
});
