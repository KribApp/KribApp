import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Wallet, ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { KribTheme } from '../../../theme/theme';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';

export default function FinancesList() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [lists, setLists] = useState<any[]>([]);

    // New List Form
    const [modalVisible, setModalVisible] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    useEffect(() => {
        if (householdId) {
            fetchLists();
        }
    }, [householdId]);

    async function fetchHouseholdAndUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data: member } = await supabase
                .from('household_members')
                .select('household_id')
                .eq('user_id', user.id)
                .single();

            if (member) {
                setHouseholdId(member.household_id);
            } else {
                // User is not in a household
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching user/household:', error);
            setLoading(false);
        }
    }

    async function fetchLists() {
        if (!householdId) return;

        try {
            const { data, error } = await supabase
                .from('expense_lists')
                .select('*')
                .eq('household_id', householdId)
                .order('created_at', { ascending: false });

            if (data) {
                setLists(data);
            }
        } catch (error) {
            console.error('Error fetching lists:', error);
        } finally {
            setLoading(false);
        }
    }

    async function createList() {
        if (!newListName.trim() || !householdId) return;
        setCreating(true);

        const { error } = await supabase
            .from('expense_lists')
            .insert([
                {
                    household_id: householdId,
                    name: newListName.trim(),
                }
            ]);

        if (error) {
            Alert.alert('Error', 'Kon lijst niet aanmaken.');
        } else {
            setNewListName('');
            setModalVisible(false);
            fetchLists();
        }
        setCreating(false);
    }

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.listCard}
            onPress={() => router.push(`/finances/${item.id}`)}
        >
            <View style={styles.iconContainer}>
                <Wallet size={24} color="#2563EB" />
            </View>
            <View style={styles.listInfo}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listMeta}>Tik om te openen</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <DrawerToggleButton tintColor="#FFFFFF" />
                <Text style={styles.headerTitle}>Mijn Lijstjes</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={lists}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.content}
                    ListEmptyComponent={
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyText}>Nog geen lijsten. Maak er een aan!</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Plus size={32} color={KribTheme.colors.primary} />
            </TouchableOpacity>

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
                        <Text style={styles.modalTitle}>Nieuwe Lijst</Text>
                        <TextInput
                            style={styles.input}
                            value={newListName}
                            onChangeText={setNewListName}
                            placeholder="Naam van de lijst (bijv. Vakantie)"
                            placeholderTextColor={KribTheme.colors.text.secondary}
                            returnKeyType="done"
                            onSubmitEditing={createList}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Annuleren</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.createButton} onPress={createList} disabled={creating}>
                                {creating ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.createButtonText}>Aanmaken</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    content: {
        padding: 16,
    },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.l,
        marginBottom: 12,
        ...KribTheme.shadows.card,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    listInfo: {
        flex: 1,
    },
    listName: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.primary,
        marginBottom: 4,
    },
    listMeta: {
        fontSize: 14,
        color: '#6B7280',
    },
    emptyList: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        textAlign: 'center',
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
        marginTop: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
        borderRadius: KribTheme.borderRadius.m,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: KribTheme.colors.text.primary,
    },
    addButton: {
        backgroundColor: '#FFFFFF',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        ...KribTheme.shadows.card,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.xl,
        padding: 24,
        ...KribTheme.shadows.floating,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
        marginBottom: 24,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...KribTheme.shadows.floating,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#4B5563',
        fontWeight: '600',
        fontSize: 16,
    },
    createButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#2563EB',
        alignItems: 'center',
    },
    createButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});
