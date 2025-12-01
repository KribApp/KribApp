import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Trash2, AlertTriangle, ChefHat, Pin, PinOff } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { KribTheme } from '../../../theme/theme';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useNavigation, useRouter, useFocusEffect } from 'expo-router';

export default function Groceries() {
    const navigation = useNavigation();
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (householdId) {
                fetchItems();
                const subscription = subscribeToItems();
                return () => {
                    subscription.unsubscribe();
                };
            }
        }, [householdId])
    );

    async function fetchHouseholdAndUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: members, error } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id)
            .limit(1);

        if (error) {
            console.error('Error fetching household:', error);
            return;
        }

        if (members && members.length > 0) {
            setHouseholdId(members[0].household_id);
        } else {
            Alert.alert('Geen huis gevonden', 'Je bent nog geen lid van een huis. Ga naar het dashboard om een huis te maken of te joinen.');
        }
    }

    const sortedItems = useMemo(() => {
        const sorted = [...items].sort((a, b) => {
            // 1. Pinned & Unchecked (Highest Priority)
            if (a.is_pinned && !a.is_checked && (!b.is_pinned || b.is_checked)) return -1;
            if (b.is_pinned && !b.is_checked && (!a.is_pinned || a.is_checked)) return 1;

            // 2. Pinned & Checked (Second Priority)
            if (a.is_pinned && a.is_checked && !b.is_pinned) return -1;
            if (b.is_pinned && b.is_checked && !a.is_pinned) return 1;

            // 3. Unchecked (Normal) vs Checked (Normal)
            if (a.is_checked !== b.is_checked) {
                return a.is_checked ? 1 : -1;
            }

            // If both are pinned (or both not pinned) and have same check status:
            // If items are checked, sort by Newest First (recently bought at top of checked list)
            if (a.is_checked) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }

            // If items are unchecked, sort by Oldest First (longest out of stock at top of list)
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        return sorted;
    }, [items]);

    async function fetchItems() {
        if (!householdId) return;
        const { data, error } = await supabase
            .from('shopping_items')
            .select('*')
            .eq('household_id', householdId)
            .order('created_at', { ascending: true }); // Default to oldest first for initial fetch

        if (data) {
            setItems(data);
            setLoading(false);
        }
    }

    function subscribeToItems() {
        return supabase
            .channel('shopping_items')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'shopping_items',
                    filter: `household_id=eq.${householdId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setItems((prev) => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setItems((prev) => prev.map((item) => (item.id === payload.new.id ? payload.new : item)));
                    } else if (payload.eventType === 'DELETE') {
                        setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
                    }
                }
            )
            .subscribe();
    }

    async function addItem() {
        if (!householdId) {
            Alert.alert('Fout', 'Je moet lid zijn van een huis om items toe te voegen.');
            return;
        }
        if (!newItemName.trim() || !userId) return;

        const name = newItemName.trim();
        setNewItemName('');

        const { data, error } = await supabase
            .from('shopping_items')
            .insert([
                {
                    household_id: householdId,
                    name,
                    added_by_user_id: userId,
                    is_checked: false,
                    is_pinned: false,
                }
            ])
            .select();

        if (error) {
            Alert.alert('Error', 'Kon item niet toevoegen.');
        } else {
            if (data) setItems(prev => [data[0], ...prev]);
        }
    }

    async function toggleItem(id: string, currentStatus: boolean) {
        const newStatus = !currentStatus;
        const updates: any = { is_checked: newStatus };

        // If unchecking (moving back to list), update created_at to now so it goes to the bottom
        if (!newStatus) {
            updates.created_at = new Date().toISOString();
        }

        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));

        const { error } = await supabase
            .from('shopping_items')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error(error);
            // Revert on error
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, is_checked: currentStatus, created_at: item.created_at } : item
            ));
        }
    }

    async function togglePin(id: string, currentStatus: boolean) {
        const newStatus = !currentStatus;
        const updates: any = { is_pinned: newStatus };

        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));

        const { error } = await supabase
            .from('shopping_items')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error(error);
            // Revert on error
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, is_pinned: currentStatus } : item
            ));
        }
    }

    async function deleteItem(id: string, isPinned: boolean) {
        if (isPinned) {
            Alert.alert('Kan niet verwijderen', 'Gepinde items kunnen niet verwijderd worden. Maak ze eerst los.');
            return;
        }
        // Optimistic update
        const previousItems = [...items];
        setItems(prev => prev.filter(item => item.id !== id));

        const { error } = await supabase
            .from('shopping_items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
            Alert.alert('Error', 'Kon item niet verwijderen.');
            // Revert on error
            setItems(previousItems);
        }
    }

    async function panicButton(itemName: string, itemId: string) {
        if (!householdId || !userId) return;

        // 1. Create notification
        const { error: notifError } = await supabase
            .from('notifications')
            .insert([
                {
                    household_id: householdId,
                    type: 'SHOPPING_ITEM_OUT_OF_STOCK',
                    title: 'Op!',
                    message: `${itemName} is op!`,
                    related_entity_id: itemId,
                    is_resolved: false
                }
            ]);

        if (!notifError) {
            Alert.alert('Melding verstuurd', `Huisgenoten zijn gewaarschuwd dat ${itemName} op is.`);
        } else {
            console.error('Error sending notification:', notifError);
            Alert.alert('Fout', 'Kon melding niet versturen.');
        }
    }

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.itemContainer, item.is_pinned && styles.itemContainerPinned]}>
            <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => toggleItem(item.id, item.is_checked)}
            >
                <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
                    {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.itemText, item.is_checked && styles.itemTextChecked]}>
                    {item.name}
                </Text>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => togglePin(item.id, item.is_pinned)} style={styles.actionButton}>
                    {item.is_pinned ? (
                        <PinOff size={20} color={KribTheme.colors.text.secondary} />
                    ) : (
                        <Pin size={20} color={KribTheme.colors.text.secondary} />
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => panicButton(item.name, item.id)} style={styles.actionButton}>
                    <AlertTriangle size={20} color={KribTheme.colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(item.id, item.is_pinned)} style={[styles.actionButton, { opacity: item.is_pinned ? 0.3 : 1 }]}>
                    <Trash2 size={20} color={KribTheme.colors.error} />
                </TouchableOpacity>
            </View>
        </View >
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <DrawerToggleButton tintColor="#FFFFFF" />
                <Text style={styles.headerTitle}>Boodschappen</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/groceries/hall-of-fame')}>
                    <ChefHat size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <View style={styles.addItemContainer}>
                    <TextInput
                        style={styles.input}
                        value={newItemName}
                        onChangeText={setNewItemName}
                        placeholder="Nieuw item toevoegen..."
                        placeholderTextColor={KribTheme.colors.text.secondary}
                        onSubmitEditing={addItem}
                        returnKeyType="done"
                    />
                    <TouchableOpacity style={styles.addButton} onPress={addItem}>
                        <Plus size={24} color={KribTheme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={sortedItems}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyList}>
                                <View style={styles.emptyListCard}>
                                    <Text style={styles.emptyListText}>Je koelkast is leeg (of vol)!</Text>
                                </View>
                            </View>
                        }
                    />
                )}
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
    addItemContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: KribTheme.colors.background,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: KribTheme.borderRadius.m,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginRight: 12,
        color: '#000000',
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
    listContent: {
        padding: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.l,
        marginBottom: 8,
        ...KribTheme.shadows.card,
    },
    itemContainerPinned: {
        borderLeftWidth: 4,
        borderLeftColor: KribTheme.colors.primary,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: KribTheme.colors.text.secondary,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: KribTheme.colors.primary,
        borderColor: KribTheme.colors.primary,
    },
    checkmark: {
        color: KribTheme.colors.text.inverse,
        fontSize: 14,
        fontWeight: 'bold',
    },
    itemText: {
        fontSize: 16,
        color: KribTheme.colors.text.primary,
    },
    itemTextChecked: {
        textDecorationLine: 'line-through',
        color: KribTheme.colors.text.secondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        padding: 4,
    },
    emptyList: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyListCard: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        ...KribTheme.shadows.card,
    },
    emptyListText: {
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
    },
});
