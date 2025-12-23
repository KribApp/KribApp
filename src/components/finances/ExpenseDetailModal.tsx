import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { X, FileText, User } from 'lucide-react-native';
import { KribTheme } from '../../theme/theme';
import { supabase } from '../../services/supabase';

interface ExpenseDetailModalProps {
    visible: boolean;
    onClose: () => void;
    expense: any; // Using any for now to be flexible, but should match Expense type
}

export default function ExpenseDetailModal({ visible, onClose, expense }: ExpenseDetailModalProps) {
    const [loading, setLoading] = useState(true);
    const [shares, setShares] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);

    useEffect(() => {
        if (visible && expense) {
            fetchDetails();
        }
    }, [visible, expense]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
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

            // Show if user is payer OR has a share (even if net is 0)
            const hasShare = share && share.owed_amount > 0;
            if (!isPayer && !hasShare) return null;

            const isPositive = netImpact > 0.001;
            const isNegative = netImpact < -0.001;

            // Format color: Green for receive, Red for pay, Gray for neutral (0)
            let color = KribTheme.colors.text.secondary;
            if (isPositive) color = KribTheme.colors.success;
            if (isNegative) color = KribTheme.colors.error;

            return (
                <View key={member.user_id} style={styles.impactRow}>
                    <View style={styles.userContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {userData?.username?.charAt(0) || '?'}
                            </Text>
                        </View>
                        <Text style={styles.username}>{userData?.username || 'Onbekend'}</Text>
                        {isPayer && <Text style={styles.payerBadge}> (Betaald)</Text>}
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
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Details</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Main Info */}
                        <View style={styles.mainInfo}>
                            <Text style={styles.description}>{expense.description}</Text>
                            <Text style={styles.amount}>€ {expense.amount.toFixed(2)}</Text>
                            <Text style={styles.date}>
                                {new Date(expense.created_at).toLocaleDateString('nl-NL', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Impact List */}
                        <Text style={styles.sectionTitle}>Effect op balans</Text>
                        {loading ? (
                            <ActivityIndicator color={KribTheme.colors.primary} style={{ marginTop: 20 }} />
                        ) : (
                            <View style={styles.impactList}>
                                {renderImpactList()}
                            </View>
                        )}

                        {/* Receipt */}
                        {expense.receipt_url && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.sectionTitle}>Bonnetje</Text>
                                <View style={styles.receiptContainer}>
                                    <Image
                                        source={{ uri: expense.receipt_url }}
                                        style={styles.receiptImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: KribTheme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingTop: 24,
        ...KribTheme.shadows.floating,
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
        color: '#FFFFFF',
    },
    closeButton: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
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
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    amount: {
        fontSize: 32,
        fontWeight: '900',
        // Make it pop against dark bg if needed, or stick to primary
        color: '#FFFFFF',
    },
    date: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 16,
    },
    impactList: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
        backgroundColor: KribTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    username: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    payerBadge: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        fontStyle: 'italic',
    },
    impactAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    receiptContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 8,
        height: 300,
        marginBottom: 40,
    },
    receiptImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    }
});
