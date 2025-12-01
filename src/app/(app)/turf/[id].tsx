import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Modal, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Minus, ArrowLeft, UserPlus, X, RotateCcw } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KribTheme } from '../../../theme/theme';

export default function TurfDetail() {
    const { id } = useLocalSearchParams();
    const listName = decodeURIComponent(id as string);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [counters, setCounters] = useState<any[]>([]);

    // Member Management
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    useEffect(() => {
        if (householdId) {
            fetchCounters();
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
        const newCount = (counter.count || 0) + delta;
        if (newCount < 0) return;

        // Optimistic update
        setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, count: newCount } : c));

        const { error } = await supabase
            .from('turf_counters')
            .update({ count: newCount, updated_at: new Date().toISOString() })
            .eq('id', counter.id);

        if (error) {
            // Revert
            setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, count: counter.count } : c));
        }
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
        <View style={styles.counterCard}>
            <Text style={styles.memberName}>{item.users?.username || 'Onbekend'}</Text>
            <View style={styles.counterControls}>
                <TouchableOpacity onPress={() => updateCounter(item, -1)} style={styles.controlButton}>
                    <Minus size={20} color={KribTheme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.count}>{item.count}</Text>
                <TouchableOpacity onPress={() => updateCounter(item, 1)} style={styles.controlButton}>
                    <Plus size={20} color={KribTheme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => resetCounter(item)} style={[styles.controlButton, { marginLeft: 8 }]}>
                    <RotateCcw size={18} color={KribTheme.colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMemberItem = ({ item }: { item: any }) => {
        const isAdded = counters.some(c => c.user_id === item.user_id);
        return (
            <View style={styles.modalMemberItem}>
                <Text style={styles.modalMemberName}>{item.users?.username}</Text>
                <TouchableOpacity
                    style={[styles.actionButton, isAdded ? styles.removeButton : styles.addButton]}
                    onPress={() => isAdded ? removeMemberFromList(item.user_id) : addMemberToList(item)}
                >
                    <Text style={[styles.actionButtonText, isAdded ? styles.removeButtonText : styles.addButtonText]}>
                        {isAdded ? 'Verwijder' : 'Toevoegen'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{listName}</Text>
                <TouchableOpacity onPress={openMemberModal} style={styles.addButtonHeader}>
                    <UserPlus size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={counters}
                    renderItem={renderCounter}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Nog geen leden in deze lijst.</Text>
                            <TouchableOpacity onPress={openMemberModal} style={styles.emptyButton}>
                                <Text style={styles.emptyButtonText}>+ Leden toevoegen</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <Modal
                visible={showMemberModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowMemberModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Leden beheren</Text>
                        <TouchableOpacity onPress={() => setShowMemberModal(false)} style={styles.closeButton}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    {loadingMembers ? (
                        <ActivityIndicator style={{ marginTop: 20 }} />
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
        backgroundColor: '#FFFFFF',
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
        color: '#111827',
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
        color: '#111827',
        minWidth: 24,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        gap: 16,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
    },
    emptyButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#2563EB',
        borderRadius: 24,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
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
        color: '#111827',
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
        color: '#2563EB',
    },
    removeButtonText: {
        color: '#EF4444',
    },
});
