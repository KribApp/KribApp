import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Trash2, ChevronRight, Menu } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { KribTheme } from '../../../theme/theme';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

export default function TurfOverview() {
    const router = useRouter();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const [lists, setLists] = useState<string[]>([]);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: members } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id)
            .limit(1);

        if (members && members.length > 0) {
            setHouseholdId(members[0].household_id);
        }
    }

    async function fetchLists() {
        if (!householdId) return;
        const { data } = await supabase
            .from('turf_counters')
            .select('item_name')
            .eq('household_id', householdId);

        if (data) {
            // Get unique item names
            const uniqueNames = Array.from(new Set(data.map(item => item.item_name)));
            setLists(uniqueNames.sort());
            setLoading(false);
        }
    }

    async function addList() {
        if (!newListName.trim() || !householdId || !userId) return;
        setCreating(true);
        const name = newListName.trim();

        if (lists.includes(name)) {
            Alert.alert('Error', 'Deze lijst bestaat al.');
            setCreating(false);
            return;
        }

        // Create initial counter for current user to establish the list
        const { error } = await supabase
            .from('turf_counters')
            .insert([
                {
                    household_id: householdId,
                    user_id: userId,
                    item_name: name,
                    count: 0
                }
            ]);

        if (error) {
            Alert.alert('Error', 'Kon lijst niet aanmaken.');
        } else {
            setLists(prev => [...prev, name].sort());
            setNewListName('');
        }
        setCreating(false);
    }

    async function deleteList(name: string) {
        Alert.alert(
            'Lijst verwijderen',
            `Weet je zeker dat je "${name}" wilt verwijderen? Dit verwijdert alle tellers voor iedereen.`,
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Verwijderen',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase
                            .from('turf_counters')
                            .delete()
                            .eq('household_id', householdId)
                            .eq('item_name', name);

                        if (error) {
                            Alert.alert('Error', 'Kon lijst niet verwijderen.');
                        } else {
                            setLists(prev => prev.filter(l => l !== name));
                        }
                    }
                }
            ]
        );
    }

    const renderItem = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.listCard}
            onPress={() => router.push(`/turf/${encodeURIComponent(item)}`)}
        >
            <View style={styles.listInfo}>
                <Text style={styles.listName}>{item}</Text>
            </View>
            <View style={styles.listActions}>
                <TouchableOpacity onPress={() => deleteList(item)} style={styles.deleteButton}>
                    <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
                <ChevronRight size={20} color={KribTheme.colors.text.secondary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}>
                    <Menu size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Turflijstjes</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <View style={styles.content}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={newListName}
                            onChangeText={setNewListName}
                            placeholder="Nieuwe lijst (bijv. Bier)..."
                            placeholderTextColor={KribTheme.colors.text.secondary}
                            returnKeyType="done"
                            onSubmitEditing={addList}
                        />
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={addList}
                            disabled={creating}
                        >
                            {creating ? (
                                <ActivityIndicator color={KribTheme.colors.primary} />
                            ) : (
                                <Plus size={24} color={KribTheme.colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <FlatList
                            data={lists}
                            renderItem={renderItem}
                            keyExtractor={item => item}
                            contentContainerStyle={styles.listContainer}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>Nog geen lijsten. Maak er een aan!</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
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
        flex: 1,
        padding: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.m,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: KribTheme.colors.text.primary,
        ...KribTheme.shadows.card,
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
    listContainer: {
        gap: 12,
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
    listInfo: {
        flex: 1,
    },
    listName: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.primary,
    },
    listActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteButton: {
        padding: 8,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 32,
    },
    emptyText: {
        textAlign: 'center',
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
        marginTop: 24,
    },
});
