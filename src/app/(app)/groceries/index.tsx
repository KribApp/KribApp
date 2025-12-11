import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Trash2, AlertTriangle, ChefHat, Pin, PinOff, GripVertical } from 'lucide-react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { StatusBar } from 'expo-status-bar';
import { KribTheme } from '../../../theme/theme';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useRouter, useFocusEffect } from 'expo-router';
import { ShoppingItem } from '../../../types/models';
import { Strings } from '../../../constants/strings';

export default function Groceries() {
    const router = useRouter();
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Fetch household and user on mount
    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    // Fetch/subscribe to items when householdId changes
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

    const fetchHouseholdAndUser = useCallback(async () => {
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
            Alert.alert(Strings.household.noHouseFound, Strings.household.notMemberMessage);
        }
    }, []);

    const sortedItems = useMemo(() => {
        const sorted = [...items].sort((a, b) => {
            // 1. Pinned items always at top
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            // 2. If both pinned, sort by created_at
            if (a.is_pinned && b.is_pinned) {
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

    const fetchItems = useCallback(async () => {
        if (!householdId) return;
        const { data, error } = await supabase
            .from('shopping_items')
            .select('*')
            .eq('household_id', householdId)
            .order('position', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching items:', error);
        }
        if (data) {
            setItems(data as ShoppingItem[]);
            setLoading(false);
        }
    }, [householdId]);

    const subscribeToItems = useCallback(() => {
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
                    const newItem = payload.new as ShoppingItem;
                    const oldItem = payload.old as { id: string };
                    if (payload.eventType === 'INSERT') {
                        setItems((prev) => [newItem, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setItems((prev) => prev.map((item) => (item.id === newItem.id ? newItem : item)));
                    } else if (payload.eventType === 'DELETE') {
                        setItems((prev) => prev.filter((item) => item.id !== oldItem.id));
                    }
                }
            )
            .subscribe();
    }, [householdId]);

    const addItem = useCallback(async () => {
        if (!householdId) {
            Alert.alert(Strings.common.error, Strings.groceries.mustBeMember);
            return;
        }
        if (!newItemName.trim() || !userId) return;

        const name = newItemName.trim();
        setNewItemName('');
        setSubmitting(true);

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

        setSubmitting(false);

        if (error) {
            Alert.alert(Strings.common.error, Strings.groceries.addError);
            setNewItemName(name); // Restore input on error
        } else if (data) {
            setItems(prev => [data[0] as ShoppingItem, ...prev]);
        }
    }, [householdId, userId, newItemName, items]);

    const toggleItem = useCallback(async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        const updates: Partial<ShoppingItem> = { is_checked: newStatus };

        // If unchecking (moving back to list), update created_at to now
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
            console.error('Toggle item error:', error);
            Alert.alert(Strings.common.error, Strings.groceries.updateError);
            // Revert on error
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, is_checked: currentStatus } : item
            ));
        }
    }, []);

    const togglePin = useCallback(async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;

        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, is_pinned: newStatus } : item
        ));

        const { error } = await supabase
            .from('shopping_items')
            .update({ is_pinned: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Toggle pin error:', error);
            Alert.alert(Strings.common.error, Strings.groceries.updateError);
            // Revert on error
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, is_pinned: currentStatus } : item
            ));
        }
    }, []);

    const deleteItem = useCallback(async (id: string, isPinned: boolean) => {
        if (isPinned) {
            Alert.alert(Strings.common.error, Strings.groceries.cannotDeletePinned);
            return;
        }

        // Store previous state for rollback
        const previousItems = [...items];

        // Optimistic update
        setItems(prev => prev.filter(item => item.id !== id));

        const { error } = await supabase
            .from('shopping_items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete item error:', error);
            Alert.alert(Strings.common.error, Strings.groceries.deleteError);
            // Revert on error
            setItems(previousItems);
        }
    }, [items]);

    const panicButton = useCallback(async (itemName: string, itemId: string) => {
        if (!householdId || !userId) return;

        const { error: notifError } = await supabase
            .from('notifications')
            .insert([
                {
                    household_id: householdId,
                    type: 'SHOPPING_ITEM_OUT_OF_STOCK',
                    title: Strings.groceries.outOfStock,
                    message: Strings.groceries.outOfStockMessage(itemName),
                    related_entity_id: itemId,
                    is_resolved: false
                }
            ]);

        if (!notifError) {
            Alert.alert(Strings.groceries.notificationSent, Strings.groceries.notificationSentMessage(itemName));
        } else {
            console.error('Error sending notification:', notifError);
            Alert.alert(Strings.common.error, Strings.groceries.notificationError);
        }
    }, [householdId, userId]);

    const onDragEnd = useCallback(async ({ data }: { data: ShoppingItem[] }) => {
        // Optimistic update
        setItems(prev => {
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
        const updates = data.map((item, index) => ({
            id: item.id,
            position: index,
        }));

        for (const update of updates) {
            const { error } = await supabase
                .from('shopping_items')
                .update({ position: update.position })
                .eq('id', update.id);

            if (error) {
                console.error('Error updating position:', error);
            }
        }
    }, []);

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ShoppingItem>) => (
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
                    onPress={() => toggleItem(item.id, item.is_checked ?? false)}
                >
                    <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
                        {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.itemText, item.is_checked && styles.itemTextChecked]}>
                        {item.name}
                    </Text>
                </TouchableOpacity>

                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => togglePin(item.id, item.is_pinned ?? false)} style={styles.actionButton}>
                        {item.is_pinned ? (
                            <PinOff size={20} color={KribTheme.colors.text.secondary} />
                        ) : (
                            <Pin size={20} color={KribTheme.colors.text.secondary} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => panicButton(item.name, item.id)} style={styles.actionButton}>
                        <AlertTriangle size={20} color={KribTheme.colors.warning} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => deleteItem(item.id, item.is_pinned ?? false)}
                        style={[styles.actionButton, { opacity: item.is_pinned ? 0.3 : 1 }]}
                    >
                        <Trash2 size={20} color={KribTheme.colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        </ScaleDecorator>
    ), [toggleItem, togglePin, panicButton, deleteItem]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <DrawerToggleButton tintColor="#FFFFFF" />
                <Text style={styles.headerTitle}>{Strings.groceries.title}</Text>
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
                        placeholder={Strings.groceries.addItemPlaceholder}
                        placeholderTextColor={KribTheme.colors.text.secondary}
                        onSubmitEditing={addItem}
                        returnKeyType="done"
                        editable={!submitting}
                    />
                    <TouchableOpacity
                        style={[styles.addButton, submitting && styles.addButtonDisabled]}
                        onPress={addItem}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={KribTheme.colors.primary} />
                        ) : (
                            <Plus size={24} color={KribTheme.colors.primary} />
                        )}
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
                                    <Text style={styles.emptyListText}>{Strings.groceries.emptyList}</Text>
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
    addButtonDisabled: {
        opacity: 0.6,
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
