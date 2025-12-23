import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Modal, Alert, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Minus, ArrowLeft, UserPlus, X, RotateCcw, Calculator, Undo2 } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { KribTheme } from '../../../theme/theme';

export default function TurfDetail() {
    const { id } = useLocalSearchParams();
    const { theme, isDarkMode } = useTheme();
    const listName = decodeURIComponent(id as string);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [counters, setCounters] = useState<any[]>([]);

    // Member Management
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Custom Amount & Undo
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customAmount, setCustomAmount] = useState('');
    const [selectedCounter, setSelectedCounter] = useState<any>(null);
    const [undoStack, setUndoStack] = useState<{ id: string, delta: number, timestamp: number, counterId: string }[]>([]);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showUndo, setShowUndo] = useState(false);

    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    useEffect(() => {
        if (householdId) {
            fetchCounters();
            const subscription = subscribeToCounters();
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [householdId]);

    async function fetchHouseholdAndUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: members } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id)
            .limit(1);

        if (members && members.length > 0) {
            setHouseholdId(members[0].household_id);
        }
    }

    async function fetchCounters() {
        if (!householdId) return;

        const { data } = await supabase
            .from('turf_counters')
            .select('*, users(username)')
            .eq('household_id', householdId)
            .eq('item_name', listName)
            .order('updated_at', { ascending: false });

        if (data) {
            setCounters(data);
            setLoading(false);
        }
    }

    function subscribeToCounters() {
        return supabase
            .channel('turf_counters_detail')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'turf_counters',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    // Refresh if the item name matches or if we need to check membership
                    fetchCounters();
                }
            )
            .subscribe();
    }

    async function fetchAllMembers() {
        if (!householdId) return;
        setLoadingMembers(true);
        const { data } = await supabase
            .from('household_members')
            .select('user_id, users(username)')
            .eq('household_id', householdId);

        if (data) {
            setAllMembers(data);
        }
        setLoadingMembers(false);
    }

    function openMemberModal() {
        setShowMemberModal(true);
        fetchAllMembers();
    }

    async function addMemberToList(member: any) {
        if (!householdId) return;

        const { data, error } = await supabase
            .from('turf_counters')
            .insert([{
                household_id: householdId,
                user_id: member.user_id,
                item_name: listName,
                count: 0
            }])
            .select('*, users(username)')
            .single();

        if (error) {
            Alert.alert('Error', 'Kon lid niet toevoegen.');
        } else if (data) {
            setCounters(prev => [data, ...prev]);
        }
    }

    async function removeMemberFromList(memberId: string) {
        const { error } = await supabase
            .from('turf_counters')
            .delete()
            .eq('household_id', householdId)
            .eq('item_name', listName)
            .eq('user_id', memberId);

        if (error) {
            Alert.alert('Error', 'Kon lid niet verwijderen.');
        } else {
            setCounters(prev => prev.filter(c => c.user_id !== memberId));
        }
    }

    async function updateCounter(counter: any, delta: number) {
        // Removed negative check to allow negative balances
        const newCount = (counter.count || 0) + delta;

        // Optimistic update
        setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, count: newCount } : c));

        // Add to Undo Stack
        const action = { id: Date.now().toString(), delta, timestamp: Date.now(), counterId: counter.id };
        setUndoStack(prev => [action, ...prev].slice(0, 1)); // Keep only last action for simple 1-step undo
        setShowUndo(true);

        // Auto-hide undo after 5 seconds
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = setTimeout(() => {
            setShowUndo(false);
        }, 5000);

        const { error } = await supabase
            .from('turf_counters')
            .update({ count: newCount, updated_at: new Date().toISOString() })
            .eq('id', counter.id);

        if (error) {
            // Revert
            setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, count: counter.count } : c));
        }
    }

    async function handleUndo() {
        if (undoStack.length === 0) return;
        const action = undoStack[0];
        const counter = counters.find(c => c.id === action.counterId);

        if (counter) {
            // Reverse the delta
            await updateCounter(counter, -action.delta); // This will add a new "undo" action to stack, ideally we pop it but for simplicity we just reverse action
            // Optimization: Remove the "undo" action we just triggered from stack to prevent loop? 
            // Actually, calling updateCounter will overwrite the stack with the undo action. 
            // To make it cleaner, we should probably separate the DB update from the UI trigger or manage stack manually.
            // Let's manually do the reversal and clear stack.
        }
        setShowUndo(false);
        setUndoStack([]);
    }

    // Fix: Redefine handleUndo to avoid loop
    async function executeUndo() {
        if (undoStack.length === 0) return;
        const action = undoStack[0];
        const counter = counters.find(c => c.id === action.counterId);

        if (counter) {
            const newCount = (counter.count || 0) - action.delta;

            // Optimistic
            setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, count: newCount } : c));
            setShowUndo(false);
            setUndoStack([]);

            const { error } = await supabase
                .from('turf_counters')
                .update({ count: newCount, updated_at: new Date().toISOString() })
                .eq('id', counter.id);

            if (error) {
                // Revert if error
                setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, count: counter.count } : c));
            }
        }
    }

    function openCustomModal(counter: any) {
        setSelectedCounter(counter);
        setCustomAmount('');
        setShowCustomModal(true);
    }

    async function handleCustomAmountSubmit() {
        if (!selectedCounter || !customAmount) return;
        const amount = parseInt(customAmount);
        if (isNaN(amount)) {
            Alert.alert('Error', 'Voer een geldig getal in.');
            return;
        }

        // Add the amount (not replace)
        await updateCounter(selectedCounter, amount);
        setShowCustomModal(false);
    }

    async function resetCounter(counter: any) {
        Alert.alert(
            'Resetten',
            `Weet je zeker dat je de teller voor ${counter.users?.username} wilt resetten naar 0?`,
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Resetten',
                    style: 'destructive',
                    onPress: async () => {
                        const previousCount = counter.count;
                        // Optimistic update
                        setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, count: 0 } : c));

                        const { error } = await supabase
                            .from('turf_counters')
                            .update({ count: 0, updated_at: new Date().toISOString() })
                            .eq('id', counter.id);

                        if (error) {
                            // Revert
                            setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, count: previousCount } : c));
                        }
                    }
                }
            ]
        );
    }

    const renderCounter = ({ item }: { item: any }) => (
        <View style={[styles.counterCard, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
            <Text style={[styles.memberName, { color: theme.colors.text.primary }]}>{item.users?.username || 'Onbekend'}</Text>
            <View style={styles.counterControls}>
                <TouchableOpacity onPress={() => updateCounter(item, -1)} style={[styles.controlButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Minus size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.count, { color: theme.colors.text.primary }]}>{item.count}</Text>
                <TouchableOpacity onPress={() => updateCounter(item, 1)} style={[styles.controlButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Plus size={20} color={theme.colors.primary} />
                </TouchableOpacity>

                {/* Custom Amount Button */}
                <TouchableOpacity onPress={() => openCustomModal(item)} style={[styles.controlButton, { marginLeft: 8, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Calculator size={18} color={theme.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => resetCounter(item)} style={[styles.controlButton, { marginLeft: 4, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <RotateCcw size={18} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMemberItem = ({ item }: { item: any }) => {
        const isAdded = counters.some(c => c.user_id === item.user_id);
        return (
            <View style={[styles.modalMemberItem, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                <Text style={[styles.modalMemberName, { color: theme.colors.text.primary }]}>{item.users?.username}</Text>
                <TouchableOpacity
                    style={[styles.actionButton, isAdded ? [styles.removeButton, { backgroundColor: theme.colors.error + '20' }] : [styles.addButton, { backgroundColor: theme.colors.primary + '20' }]]}
                    onPress={() => isAdded ? removeMemberFromList(item.user_id) : addMemberToList(item)}
                >
                    <Text style={[styles.actionButtonText, isAdded ? [styles.removeButtonText, { color: theme.colors.error }] : [styles.addButtonText, { color: theme.colors.primary }]]}>
                        {isAdded ? 'Verwijder' : 'Toevoegen'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "light"} />
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.onBackground} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>{listName}</Text>
                <TouchableOpacity onPress={openMemberModal} style={styles.addButtonHeader}>
                    <UserPlus size={24} color={theme.colors.onBackground} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
            ) : (
                <FlatList
                    data={counters}
                    renderItem={renderCounter}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Nog geen leden in deze lijst.</Text>
                            <TouchableOpacity onPress={openMemberModal} style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}>
                                <Text style={[styles.emptyButtonText, { color: theme.colors.text.inverse }]}>+ Leden toevoegen</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Undo Snackbar */}
            {showUndo && (
                <View style={[styles.undoContainer, { backgroundColor: theme.colors.text.primary }]}>
                    <Text style={[styles.undoText, { color: theme.colors.background }]}>Actie uitgevoerd</Text>
                    <TouchableOpacity onPress={executeUndo} style={styles.undoButton}>
                        <Undo2 size={18} color={theme.colors.background} />
                        <Text style={[styles.undoButtonText, { color: theme.colors.background }]}>Ongedaan maken</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                visible={showMemberModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowMemberModal(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                    <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>Leden beheren</Text>
                        <TouchableOpacity onPress={() => setShowMemberModal(false)} style={styles.closeButton}>
                            <X size={24} color={theme.colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                    {loadingMembers ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
                    ) : (
                        <FlatList
                            data={allMembers}
                            renderItem={renderMemberItem}
                            keyExtractor={item => item.user_id}
                            contentContainerStyle={styles.modalList}
                        />
                    )}
                </View>
            </Modal>

            <Modal
                visible={showCustomModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCustomModal(false)}
            >
                <View style={[styles.customModalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.customModalContent, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                        <Text style={[styles.customModalTitle, { color: theme.colors.text.primary }]}>Aantal toevoegen</Text>
                        <Text style={[styles.customModalSubtitle, { color: theme.colors.text.secondary }]}>Huidig: {selectedCounter?.count}</Text>

                        <TextInput
                            style={[styles.customInput, { backgroundColor: theme.colors.background, color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                            value={customAmount}
                            onChangeText={setCustomAmount}
                            placeholder="Bijv. 12 (of -5)"
                            placeholderTextColor={theme.colors.text.secondary}
                            keyboardType="numbers-and-punctuation"
                            autoFocus
                        />

                        <View style={styles.customModalActions}>
                            <TouchableOpacity style={[styles.customCancelButton, { backgroundColor: theme.colors.text.secondary + '20' }]} onPress={() => setShowCustomModal(false)}>
                                <Text style={[styles.customCancelText, { color: theme.colors.text.primary }]}>Annuleren</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.customConfirmButton, { backgroundColor: theme.colors.primary }]} onPress={handleCustomAmountSubmit}>
                                <Text style={[styles.customConfirmText, { color: theme.colors.text.inverse }]}>Toevoegen</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
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
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: KribTheme.colors.background,
    },
    backButton: {
        padding: 4,
    },
    addButtonHeader: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    listContainer: {
        padding: 16,
        gap: 12,
    },
    counterCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.primary,
    },
    counterControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    controlButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: KribTheme.colors.border,
        ...KribTheme.shadows.card,
    },
    count: {
        fontSize: 18,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
        minWidth: 24,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        gap: 16,
    },
    emptyText: {
        color: KribTheme.colors.text.secondary,
        fontSize: 16,
    },
    emptyButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: KribTheme.colors.primary,
        borderRadius: 24,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: KribTheme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    closeButton: {
        padding: 4,
    },
    modalList: {
        padding: 16,
        gap: 12,
    },
    modalMemberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    modalMemberName: {
        fontSize: 16,
        fontWeight: '500',
        color: KribTheme.colors.text.primary,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    addButton: {
        backgroundColor: '#EFF6FF',
    },
    removeButton: {
        backgroundColor: '#FEF2F2',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    addButtonText: {
        color: KribTheme.colors.primary,
    },
    removeButtonText: {
        color: KribTheme.colors.error,
    },
    // Undo Styles
    undoContainer: {
        position: 'absolute',
        bottom: 40,
        left: 16,
        right: 16,
        backgroundColor: '#1F2937',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    undoText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    undoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    undoButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    // Custom Modal Styles
    customModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    customModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        ...KribTheme.shadows.card,
    },
    customModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    customModalSubtitle: {
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
    },
    customInput: {
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        borderWidth: 1,
    },
    customModalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    customCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    customCancelText: {
        fontWeight: '600',
    },
    customConfirmButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    customConfirmText: {
        fontWeight: '600',
    },
});
