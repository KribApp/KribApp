import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Trash2, AlertTriangle, ChefHat, Pin, PinOff, GripVertical } from 'lucide-react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
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
            // 1. Pinned items always at top
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            // 2. If both pinned, sort by position (or created_at if position is same/0)
            if (a.is_pinned && b.is_pinned) {
                // Pinned items might not be draggable in this design, but let's keep them stable
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }

            // 3. Unpinned items: Checked items at bottom
            if (a.is_checked !== b.is_checked) {
                return a.is_checked ? 1 : -1;
            }

            // 4. Unpinned & Unchecked: Sort by Position
            if (!a.is_checked) {
                return (a.position || 0) - (b.position || 0);
            }

            // 5. Unpinned & Checked: Sort by Newest First (recently bought)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return sorted;
    }, [items]);

    async function fetchItems() {
        if (!householdId) return;
        const { data, error } = await supabase
            .from('shopping_items')
            .select('*')
            .eq('household_id', householdId)
            .order('position', { ascending: true })
            .order('created_at', { ascending: true });

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
                    position: items.length > 0 ? Math.max(...items.map(i => i.position || 0)) + 1 : 0
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

}

const onDragEnd = async ({ data }: { data: any[] }) => {
    // Optimistic update
    setItems(prev => {
        // We only reordered the unpinned & unchecked items.
        // We need to merge this back into the full list.
        // Actually, DraggableFlatList gives us the data in the new order for the rendered list.
        // Since we might filter what we pass to DraggableFlatList, we need to be careful.
        // But here we will pass 'sortedItems' to it? No, we can't sort inside render if we want drag.
        // We should pass the full list or a subset?
        // If we pass sortedItems, and drag, 'data' is the new sortedItems.
        // We need to update the 'position' of these items based on their new index.

        const updatedItems = [...prev];
        data.forEach((item, index) => {
            const foundIndex = updatedItems.findIndex(i => i.id === item.id);
            if (foundIndex !== -1) {
                updatedItems[foundIndex] = { ...updatedItems[foundIndex], position: index };
            }
        });
        return updatedItems;
    });

    // Persist to DB
    // We only need to update the items that changed position.
    // For simplicity, we can update all in the dragged group.
    const updates = data.map((item, index) => ({
        id: item.id,
        position: index,
    }));

    for (const update of updates) {
        await supabase
            .from('shopping_items')
            .update({ position: update.position })
            .eq('id', update.id);
    }
};

const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => (
    <ScaleDecorator>
        <View style={[
            styles.itemContainer,
            item.is_pinned && styles.itemContainerPinned,
            isActive && { backgroundColor: '#F3F4F6' }
        ]}>
            {!item.is_pinned && !item.is_checked && (
                <TouchableOpacity onPressIn={drag} disabled={isActive} style={styles.dragHandle}>
                    <GripVertical size={20} color={KribTheme.colors.text.secondary} />
                </TouchableOpacity>
            )}

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
    </ScaleDecorator>
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
                <DraggableFlatList
                    data={sortedItems}
                    onDragEnd={onDragEnd}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyList}>
                            <View style={styles.emptyListCard}>
                                <Text style={styles.emptyListText}>De boodschappenlijst is leeg.</Text>
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
    dragHandle: {
        padding: 8,
        marginRight: 4,
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
