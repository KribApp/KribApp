import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Check, Calculator, Plus, Minus, Camera, FileText } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

interface HouseholdMember {
    user_id: string;
    users: {
        username: string;
        profile_picture_url: string | null;
    };
    role: string;
}

interface AddExpenseModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    householdId: string;
    members: HouseholdMember[];
    currentUserId: string;
}

export default function AddExpenseModal({ visible, onClose, onSuccess, householdId, members, currentUserId }: AddExpenseModalProps) {
    const { theme } = useTheme();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [payerId, setPayerId] = useState(currentUserId);
    const [shares, setShares] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    // Receipt
    const [receiptUri, setReceiptUri] = useState<string | null>(null);
    const [receiptAsset, setReceiptAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

    useEffect(() => {
        if (visible) {
            // Reset form
            setDescription('');
            setAmount('');
            setPayerId(currentUserId);
            setReceiptUri(null);
            setReceiptAsset(null);
        }
    }, [visible, currentUserId]); // Only reset form when modal visibility changes or current user changes

    useEffect(() => {
        if (visible && members.length > 0) {
            // Default shares: 1 for everyone
            const initialShares: Record<string, number> = {};
            members.forEach(m => {
                initialShares[m.user_id] = 1;
            });
            setShares(initialShares);

            // Check if payer is in members (safety)
            const isPayerInMembers = members.some(m => m.user_id === payerId);
            if (!isPayerInMembers && payerId === currentUserId) {
                // Should not happen if data is correct, but if it does, 
                // we might want to warn or just handle gracefully.
                // For MVP: assume members list is complete.
            }
        }
    }, [visible, members]);

    const handleShareChange = (userId: string, change: number) => {
        setShares(prev => {
            const current = (prev[userId] !== undefined) ? prev[userId] : 0;
            const next = Math.max(0, current + change);
            return { ...prev, [userId]: next };
        });
    };

    const pickReceipt = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                setReceiptUri(result.assets[0].uri);
                setReceiptAsset(result.assets[0]);
            }
        } catch (error) {
            Alert.alert('Fout', 'Kon afbeelding niet openen.');
        }
    };

    const handleSave = async () => {
        if (!description.trim()) {
            Alert.alert('Fout', 'Vul een beschrijving in.');
            return;
        }

        const cost = parseFloat(amount.replace(',', '.'));
        if (isNaN(cost) || cost <= 0) {
            Alert.alert('Fout', 'Vul een geldig bedrag in.');
            return;
        }

        const totalShares = Object.values(shares).reduce((sum, val) => sum + val, 0);
        if (totalShares === 0) {
            Alert.alert('Fout', 'Selecteer minstens één persoon die meebetaalt.');
            return;
        }

        setLoading(true);

        try {
            let uploadedReceiptUrl = null;

            if (receiptAsset && receiptAsset.base64) {
                const fileName = `${householdId}/${Date.now()}_receipt.jpg`;
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
            }

            // 1. Create Expense
            const { data: expense, error: expenseError } = await supabase
                .from('expenses')
                .insert({
                    household_id: householdId,
                    payer_user_id: payerId,
                    amount: cost,
                    description: description.trim(),
                    receipt_url: uploadedReceiptUrl
                })
                .select()
                .single();

            if (expenseError) throw expenseError;

            // 2. Create Shares based on weighted split
            const shareEntries = [];

            for (const member of members) {
                const memberShareCount = shares[member.user_id] || 0;
                if (memberShareCount > 0) {
                    const memberOwedAmount = (cost * memberShareCount) / totalShares;
                    shareEntries.push({
                        expense_id: expense.id,
                        user_id: member.user_id,
                        owed_amount: memberOwedAmount
                    });
                }
            }

            if (shareEntries.length > 0) {
                const { error: sharesError } = await supabase
                    .from('expense_shares')
                    .insert(shareEntries);

                if (sharesError) throw sharesError;
            }

            setLoading(false);
            onSuccess();
        } catch (error: any) {
            console.error('Error adding expense:', error);
            Alert.alert('Fout', 'Kon uitgave niet opslaan: ' + (error.message || 'Onbekende fout'));
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Nieuwe Uitgave</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <X size={24} color={theme.colors.onBackground} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        {/* 1. Description */}
                        {/* 1. Description */}
                        <Text style={[styles.label, { color: theme.colors.onBackground }]}>Beschrijving</Text>
                        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text.primary }]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Boodschappen, Eten, etc."
                                placeholderTextColor={theme.colors.text.secondary}
                            />
                        </View>

                        {/* 2. Amount & Receipt */}
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={[styles.label, { color: theme.colors.onBackground }]}>Bedrag (€)</Text>
                                <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                    <TextInput
                                        style={[styles.input, { color: theme.colors.text.primary }]}
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        placeholderTextColor={theme.colors.text.secondary}
                                    />
                                </View>
                            </View>
                            <View>
                                <Text style={[styles.label, { color: theme.colors.onBackground }]}>Bonnetje (Optioneel)</Text>
                                <TouchableOpacity
                                    style={[styles.receiptButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, receiptUri ? { backgroundColor: theme.colors.success } : {}]}
                                    onPress={pickReceipt}
                                >
                                    {receiptUri ? (
                                        <Check size={20} color="#FFFFFF" />
                                    ) : (
                                        <Camera size={20} color={theme.colors.text.secondary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                        {/* 3. Who Paid? */}
                        <Text style={[styles.label, { color: theme.colors.onBackground }]}>Betaald door</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerScroll}>
                            {members.map(member => (
                                <TouchableOpacity
                                    key={member.user_id}
                                    style={[
                                        styles.payerChip,
                                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                                        payerId === member.user_id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => setPayerId(member.user_id)}
                                >
                                    <Text style={[
                                        styles.payerText,
                                        { color: theme.colors.text.secondary },
                                        payerId === member.user_id && { color: theme.colors.onBackground }
                                    ]}>
                                        {member.users.username}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                        {/* 4. Split (Smart Shares) */}
                        <Text style={[styles.label, { color: theme.colors.onBackground }]}>Verdeling</Text>
                        <Text style={[styles.helperText, { color: 'rgba(255,255,255,0.7)' }]}>Wie betaalt mee? (+/- voor weging)</Text>

                        <View style={[styles.sharesList, { backgroundColor: theme.colors.surface }]}>
                            {members.map(member => {
                                // Calculate individual cost (What they consume)
                                const totalShares = Object.values(shares).reduce((sum, val) => sum + val, 0);
                                const memberShare = shares[member.user_id] || 0;
                                const totalAmount = parseFloat(amount.replace(',', '.') || '0');
                                const memberConsumed = totalShares > 0 ? (totalAmount * memberShare) / totalShares : 0;

                                return (
                                    <View key={member.user_id} style={[styles.shareRow, { borderBottomColor: theme.colors.border }]}>
                                        <View style={styles.shareUser}>
                                            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                                                <Text style={[styles.avatarText, { color: theme.colors.onBackground }]}>{member.users.username.charAt(0)}</Text>
                                            </View>
                                            <View>
                                                <Text style={[styles.shareUsername, { color: theme.colors.text.primary }]}>{member.users.username}</Text>
                                                <Text style={[styles.shareCost, { color: theme.colors.text.secondary, fontWeight: 'bold' }]}>
                                                    € {memberConsumed.toFixed(2).replace('.', ',')}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.shareControls, { backgroundColor: theme.colors.background }]}>
                                            <TouchableOpacity
                                                style={styles.controlBtn}
                                                onPress={() => handleShareChange(member.user_id, -1)}
                                            >
                                                <Minus size={16} color={theme.colors.text.primary} />
                                            </TouchableOpacity>

                                            <View style={styles.shareCount}>
                                                <Text style={[styles.shareCountText, { color: theme.colors.text.primary }]}>{shares[member.user_id] || 0}x</Text>
                                            </View>

                                            <TouchableOpacity
                                                style={[styles.controlBtn, styles.controlBtnAdd, { backgroundColor: theme.colors.primary }]}
                                                onPress={() => handleShareChange(member.user_id, 1)}
                                            >
                                                <Plus size={16} color={theme.colors.onBackground} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Space for bottom button */}
                        <View style={{ height: 40 }} />
                    </ScrollView>

                    <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.colors.surface }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.colors.primary} />
                            ) : (
                                <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>Toevoegen</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        paddingTop: 24,
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
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
        borderRadius: 12,
    },
    form: {
        flex: 1,
        paddingHorizontal: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    helperText: {
        fontSize: 14,
        marginBottom: 16,
    },
    inputContainer: {
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    input: {
        padding: 16,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    receiptButton: {
        height: 52,
        width: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    payerScroll: {
        flexGrow: 0,
        marginBottom: 16,
    },
    payerChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
    },
    payerText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sharesList: {
        borderRadius: 16,
        padding: 8,
    },
    shareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    shareUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.8,
    },
    avatarText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    shareUsername: {
        fontSize: 16,
        fontWeight: '500',
    },
    shareCost: {
        fontSize: 12,
        marginTop: 2,
    },
    shareControls: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 4,
    },
    controlBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    controlBtnAdd: { // Keep for ref but styles overridden
    },
    shareCount: {
        width: 40,
        alignItems: 'center',
    },
    shareCountText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        paddingBottom: 40,
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});
