import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { Plus, Trash2, AlertTriangle, ChefHat, Pin, PinOff, GripVertical } from 'lucide-react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../../context/ThemeContext';
import { KribTheme } from '../../../theme/theme';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useRouter, useFocusEffect } from 'expo-router';
import { ShoppingItem } from '../../../types/models';
import { Strings } from '../../../constants/strings';

export default function Groceries() {
    const router = useRouter();
    const { theme, isDarkMode } = useTheme();
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);

    // Fetch household and user on mount
    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    // Fetch favorites for suggestions
    useEffect(() => {
        if (householdId) {
            fetchFavorites();
        }
    }, [householdId]);

    async function fetchFavorites() {
        const { data } = await supabase
            .from('grocery_favorites')
            .select('*')
            .eq('household_id', householdId);
        if (data) setFavorites(data);
    }

    const filteredSuggestions = useMemo(() => {
        if (!newItemName.trim()) return [];
        const lower = newItemName.toLowerCase();
        return favorites.filter(fav => fav.name.toLowerCase().includes(lower));
    }, [newItemName, favorites]);

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

            // 2. If both pinned, sort by Position
            if (a.is_pinned && b.is_pinned) {
                return (a.position || 0) - (b.position || 0);
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
                    // Skip subscription updates while dragging to prevent conflicts
                    if (isDragging) return;

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
    }, [householdId, isDragging]);

    const addItem = useCallback(async () => {
        if (!householdId) {
            Alert.alert(Strings.common.error, Strings.groceries.mustBeMember);
            return;
        }
        if (!newItemName.trim() || !userId) return;

        // CHECK LIMIT: Max 30 items
        if (items.length >= 30) {
            Alert.alert('Limiet bereikt', 'Je hebt het maximumaantal van 30 items bereikt.');
            return;
        }

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

    const clearCompleted = useCallback(async () => {
        // Filter checked items that are NOT pinned
        const itemsToDelete = items.filter(i => i.is_checked && !i.is_pinned);

        if (itemsToDelete.length === 0) {
            if (items.some(i => i.is_checked && i.is_pinned)) {
                Alert.alert('Info', 'Alleen vastgepinde items zijn afgevinkt. Deze worden niet verwijderd.');
            }
            return;
        }

        Alert.alert(
            Strings.groceries.clearCompletedTitle || 'Gereed verwijderen',
            Strings.groceries.clearCompletedConfirm || 'Weet je zeker dat je alle afgevinkte items wilt verwijderen? (Vastgepinde items blijven staan)',
            [
                { text: Strings.common.cancel, style: 'cancel' },
                {
                    text: 'Verwijderen',
                    style: 'destructive',
                    onPress: async () => {
                        // Optimistic update
                        setItems(prev => prev.filter(i => !itemsToDelete.some(del => del.id === i.id)));

                        const itemIds = itemsToDelete.map(i => i.id);
                        const { error } = await supabase
                            .from('shopping_items')
                            .delete()
                            .in('id', itemIds);

                        if (error) {
                            console.error('Clear completed error:', error);
                            Alert.alert(Strings.common.error, Strings.groceries.deleteError);
                            fetchItems(); // Reload
                        }
                    }
                }
            ]
        );
    }, [items, fetchItems]);

    const onDragEnd = useCallback(async ({ data }: { data: ShoppingItem[] }) => {
        // 'data' here is ONLY the unpinned items in their new order
        // We need to fetch the pinned items to reconstruct the full list state
        const pinnedItems = sortedItems.filter(item => item.is_pinned);

        // Reconstruct the list: pinned items stay at top, followed by the new order of unpinned items
        const reorderedData = [...pinnedItems, ...data];

        // Update positions
        const updatedData = reorderedData.map((item, index) => ({
            ...item,
            position: index
        }));
        setItems(updatedData);

        // Persist to DB in background
        const updatePromises = updatedData.map((item, index) =>
            supabase
                .from('shopping_items')
                .update({ position: index })
                .eq('id', item.id)
        );

        try {
            await Promise.all(updatePromises);
        } catch (error) {
            console.error('Error updating positions:', error);
            fetchItems();
        } finally {
            setTimeout(() => setIsDragging(false), 500);
        }
    }, [sortedItems, fetchItems]);

    const onDragBegin = useCallback(() => {
        setIsDragging(true);
    }, []);

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ShoppingItem>) => (
        <GroceryItemRow
            item={item}
            onToggle={toggleItem}
            onTogglePin={togglePin}
            onPanic={panicButton}
            onDelete={deleteItem}
            drag={drag}
            isActive={isActive}
        />
    ), [toggleItem, togglePin, panicButton, deleteItem]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "light"} />
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <DrawerToggleButton tintColor="#FFFFFF" />
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>{Strings.groceries.title}</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={clearCompleted}>
                        <Trash2 size={24} color={theme.colors.onBackground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/(app)/groceries/hall-of-fame')}>
                        <ChefHat size={24} color={theme.colors.onBackground} />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <View style={[styles.addItemContainer, { backgroundColor: theme.colors.background }]}>
                    <View style={{ flex: 1 }}>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                            value={newItemName}
                            onChangeText={setNewItemName}
                            placeholder={Strings.groceries.addItemPlaceholder}
                            placeholderTextColor={theme.colors.text.secondary}
                            onSubmitEditing={addItem}
                            returnKeyType="done"
                            editable={!submitting}
                        />
                        {/* Suggestion Box */}
                        {filteredSuggestions.length > 0 && (
                            <View style={[styles.suggestionBox, { backgroundColor: theme.colors.surface }]}>
                                {filteredSuggestions.slice(0, 3).map(sugg => (
                                    <TouchableOpacity
                                        key={sugg.id}
                                        style={[styles.suggestionItem, { borderBottomColor: theme.colors.divider }]}
                                        onPress={() => {
                                            setNewItemName(sugg.name);
                                            // Optional: auto-add? Or just fill? Let's fill.
                                            // addItem(); // If we want to auto-add
                                        }}
                                    >
                                        <Text style={[styles.suggestionText, { color: theme.colors.text.primary }]}>{sugg.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }, submitting && styles.addButtonDisabled]}
                        onPress={addItem}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Plus size={24} color={theme.colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <DraggableFlatList
                        data={sortedItems.filter(i => !i.is_pinned)}
                        onDragBegin={onDragBegin}
                        onDragEnd={onDragEnd}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={
                            <View>
                                {sortedItems.filter(i => i.is_pinned).map(item => (
                                    <GroceryItemRow
                                        key={item.id}
                                        item={item}
                                        onToggle={toggleItem}
                                        onTogglePin={togglePin}
                                        onPanic={panicButton}
                                        onDelete={deleteItem}
                                        drag={undefined}
                                        isActive={false}
                                    />
                                ))}
                            </View>
                        }
                        ListEmptyComponent={
                            sortedItems.length === 0 ? (
                                <View style={styles.emptyList}>
                                    <View style={[styles.emptyListCard, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                                        <Text style={[styles.emptyListText, { color: theme.colors.text.secondary }]}>{Strings.groceries.emptyList}</Text>
                                    </View>
                                </View>
                            ) : null
                        }
                    />
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

// Extracted Row Component
const GroceryItemRow = ({
    item,
    onToggle,
    onTogglePin,
    onPanic,
    onDelete,
    drag,
    isActive
}: {
    item: ShoppingItem;
    onToggle: (id: string, current: boolean) => void;
    onTogglePin: (id: string, current: boolean) => void;
    onPanic: (name: string, id: string) => void;
    onDelete: (id: string, pinned: boolean) => void;
    drag?: () => void;
    isActive: boolean;
}) => {
    const { theme } = useTheme();

    const content = (
        <View style={[
            styles.itemContainer,
            { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor },
            item.is_pinned && [styles.itemContainerPinned, { borderLeftColor: theme.colors.primary }],
            isActive && { backgroundColor: theme.colors.inputBackground }
        ]}>
            {!item.is_pinned && !item.is_checked && drag && (
                <TouchableOpacity onPressIn={drag} disabled={isActive} style={styles.dragHandle}>
                    <GripVertical size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => onToggle(item.id, item.is_checked ?? false)}
            >
                <View style={[
                    styles.checkbox,
                    { borderColor: theme.colors.text.secondary },
                    item.is_checked && [styles.checkboxChecked, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]
                ]}>
                    {item.is_checked && <Text style={[styles.checkmark, { color: theme.colors.text.inverse }]}>✓</Text>}
                </View>
                <Text style={[
                    styles.itemText,
                    { color: theme.colors.text.primary },
                    item.is_checked && [styles.itemTextChecked, { color: theme.colors.text.secondary }]
                ]}>
                    {item.name}
                </Text>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => onTogglePin(item.id, item.is_pinned ?? false)} style={styles.actionButton}>
                    {item.is_pinned ? (
                        <PinOff size={20} color={theme.colors.text.secondary} />
                    ) : (
                        <Pin size={20} color={theme.colors.text.secondary} />
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onPanic(item.name, item.id)} style={styles.actionButton}>
                    <AlertTriangle size={20} color={theme.colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onDelete(item.id, item.is_pinned ?? false)}
                    style={[styles.actionButton, { opacity: item.is_pinned ? 0.3 : 1 }]}
                >
                    <Trash2 size={20} color={theme.colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (drag) {
        return (
            <ScaleDecorator>
                {content}
            </ScaleDecorator>
        );
    }

    return content;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    addItemContainer: {
        flexDirection: 'row',
        padding: 16,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginRight: 12,
        color: '#000000',
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
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
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    emptyListText: {
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
    },
    suggestionBox: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
        overflow: 'hidden',
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionText: {
        color: KribTheme.colors.text.primary,
        fontSize: 14,
    },
});
