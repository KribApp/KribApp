import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Plus, CheckCircle, Circle, Trash2, Gift } from 'lucide-react-native';

interface DayDetailProps {
    selectedDate: Date;
    chores: any[];
    members: any[];
    canManage: boolean;
    onAssignTask: () => void;
    onToggleStatus: (chore: any) => void;
    onDeleteChore: (chore: any) => void;
}

export function DayDetail({ selectedDate, chores, members, canManage, onAssignTask, onToggleStatus, onDeleteChore }: DayDetailProps) {
    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const dayChores = chores.filter(chore => {
        if (!chore.due_date) return false;
        const choreDate = new Date(chore.due_date);
        return isSameDay(choreDate, selectedDate);
    });

    const handleDelete = (chore: any) => {
        Alert.alert(
            "Taak verwijderen",
            `Weet je zeker dat je "${chore.title}" wilt verwijderen?`,
            [
                { text: "Annuleren", style: "cancel" },
                { text: "Verwijderen", style: "destructive", onPress: () => onDeleteChore(chore) }
            ]
        );
    };

    const isPastDate = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate < today;
    };

    const dayBirthdays = members.filter((m: any) => {
        const userData = Array.isArray(m.users) ? m.users[0] : m.users;
        if (!userData?.birthdate) return false;
        const birthDate = new Date(userData.birthdate);
        return birthDate.getDate() === selectedDate.getDate() &&
            birthDate.getMonth() === selectedDate.getMonth();
    }).map((m: any) => {
        const userData = Array.isArray(m.users) ? m.users[0] : m.users;
        return {
            username: userData?.username || 'Unknown',
            age: selectedDate.getFullYear() - new Date(userData.birthdate).getFullYear()
        };
    });

    return (
        <View style={styles.dayDetailContainer}>
            <View style={styles.dayDetailHeader}>
                <Text style={styles.dayDetailTitle}>
                    {selectedDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                {canManage && !isPastDate(selectedDate) && (
                    <TouchableOpacity
                        style={styles.assignButton}
                        onPress={onAssignTask}
                    >
                        <Plus size={16} color="#FFF" />
                        <Text style={styles.assignButtonText}>Taak Toewijzen</Text>
                    </TouchableOpacity>
                )}
            </View>

            {dayBirthdays.length > 0 && (
                <View style={styles.birthdayCard}>
                    <View style={styles.birthdayRow}>
                        <View style={styles.birthdayIconContainer}>
                            <Gift size={24} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={styles.birthdayLabel}>Verjaardag!</Text>
                            <Text style={styles.birthdayText}>
                                {dayBirthdays.map(b => `${b.username} wordt ${b.age} jaar!`).join('\n')} 🥳
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.contentCard}>
                {dayChores.length === 0 ? (
                    <Text style={styles.emptyDayText}>Geen taken gepland voor deze dag.</Text>
                ) : (
                    dayChores.map(chore => (
                        <View key={chore.id} style={styles.choreItem}>
                            <TouchableOpacity onPress={() => onToggleStatus(chore)}>
                                {chore.status === 'COMPLETED' ? (
                                    <CheckCircle size={24} color="#10B981" />
                                ) : (
                                    <Circle size={24} color="#D1D5DB" />
                                )}
                            </TouchableOpacity>
                            <View style={styles.choreContent}>
                                <Text style={[
                                    styles.choreTitle,
                                    chore.status === 'COMPLETED' && styles.completedText
                                ]}>{chore.title}</Text>
                                {chore.assigned_to && (
                                    <Text style={styles.choreAssignee}>
                                        👤 {chore.assigned_to.username}
                                    </Text>
                                )}
                            </View>
                            {canManage && (
                                <TouchableOpacity onPress={() => handleDelete(chore)} style={styles.deleteButton}>
                                    <Trash2 size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    dayDetailContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    contentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    dayDetailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    dayDetailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textTransform: 'capitalize',
        flex: 1,
    },
    assignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    assignButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 4,
    },
    emptyDayText: {
        color: '#6B7280',
        fontStyle: 'italic',
    },
    choreItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    choreContent: {
        marginLeft: 12,
        flex: 1,
    },
    choreTitle: {
        fontSize: 16,
        color: '#111827',
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#9CA3AF',
    },
    choreAssignee: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    deleteButton: {
        padding: 8,
    },
    birthdayCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    birthdayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    birthdayIconContainer: {
        backgroundColor: '#FDE68A',
        padding: 8,
        borderRadius: 20,
    },
    birthdayLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#B45309',
        marginBottom: 2,
    },
    birthdayText: {
        fontSize: 16,
        color: '#78350F',
    },
});
