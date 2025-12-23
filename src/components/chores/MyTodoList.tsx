import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { KribTheme } from '../../theme/theme';
import { Chore } from '../../types/models';
import { Check, Circle, Clock } from 'lucide-react-native';

interface MyTodoListProps {
    chores: Chore[];
    userId: string | null;
    onToggleStatus: (chore: Chore) => void;
}

export function MyTodoList({ chores, userId, onToggleStatus }: MyTodoListProps) {
    const myChores = chores.filter(c => c.assigned_to_user_id === userId);

    // Sort: Overdue first, then Pending by date, then Completed
    const sortedChores = [...myChores].sort((a, b) => {
        if (a.status === b.status) {
            return new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime();
        }
        if (a.status === 'OVERDUE') return -1;
        if (b.status === 'OVERDUE') return 1;
        if (a.status === 'PENDING') return -1;
        if (b.status === 'PENDING') return 1;
        return 0;
    });

    const renderItem = ({ item }: { item: Chore }) => {
        const isCompleted = item.status === 'COMPLETED';
        const isOverdue = item.status === 'OVERDUE'; // In a real app we'd check date vs now, but relying on status field for now or check date manually.
        const dueDate = item.due_date ? new Date(item.due_date) : null;
        const isLate = dueDate && dueDate < new Date() && !isCompleted;

        return (
            <TouchableOpacity
                style={[
                    styles.choreItem,
                    isCompleted && styles.choreItemCompleted,
                    isLate && !isCompleted && styles.choreItemOverdue
                ]}
                onPress={() => onToggleStatus(item)}
            >
                <View style={styles.checkIcon}>
                    {isCompleted ? (
                        <Check size={20} color={KribTheme.colors.success} />
                    ) : (
                        <Circle size={20} color={isLate ? KribTheme.colors.error : KribTheme.colors.text.secondary} />
                    )}
                </View>
                <View style={styles.content}>
                    <Text style={[
                        styles.title,
                        isCompleted && styles.titleCompleted,
                        isLate && !isCompleted && styles.titleOverdue
                    ]}>
                        {item.title}
                    </Text>
                    {dueDate && (
                        <View style={styles.metaRow}>
                            <Clock size={12} color={isLate ? KribTheme.colors.error : KribTheme.colors.text.secondary} />
                            <Text style={[
                                styles.dateText,
                                isLate && { color: KribTheme.colors.error }
                            ]}>
                                {dueDate.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </Text>
                            {item.points && (
                                <Text style={styles.points}>• {item.points} pnt</Text>
                            )}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (myChores.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Je hebt momenteel geen taken, lekker bezig!</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={sortedChores}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#FFFFFF',
        fontSize: 16,
        textAlign: 'center',
    },
    choreItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.m,
        marginBottom: 12,
        ...KribTheme.shadows.card,
    },
    choreItemCompleted: {
        opacity: 0.6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    choreItemOverdue: {
        borderLeftWidth: 4,
        borderLeftColor: KribTheme.colors.error,
    },
    checkIcon: {
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: KribTheme.colors.text.primary,
        marginBottom: 4,
    },
    titleCompleted: {
        textDecorationLine: 'line-through',
        color: KribTheme.colors.text.secondary,
    },
    titleOverdue: {
        color: KribTheme.colors.error,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    points: {
        fontSize: 12,
        color: KribTheme.colors.warning,
        fontWeight: '600',
    },
});
