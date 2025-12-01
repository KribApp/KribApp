import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface CalendarViewProps {
    currentMonth: Date;
    selectedDate: Date;
    chores: any[];
    onMonthChange: (delta: number) => void;
    onDateSelect: (date: Date) => void;
}

import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

export function CalendarView({ currentMonth, selectedDate, chores, onMonthChange, onDateSelect }: CalendarViewProps) {
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay(); // 0 = Sunday
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const getChoresForDate = (date: Date) => {
        return chores.filter(chore => {
            if (!chore.due_date) return false;
            const choreDate = new Date(chore.due_date);
            return isSameDay(choreDate, date);
        });
    };

    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const startDay = (firstDay === 0 ? 6 : firstDay - 1); // Monday start

    const days = [];
    for (let i = 0; i < startDay; i++) {
        days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
        const dayChores = getChoresForDate(date);
        const isSelected = isSameDay(date, selectedDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const isToday = checkDate.getTime() === today.getTime();
        const isPast = checkDate.getTime() < today.getTime();

        days.push(
            <TouchableOpacity
                key={i}
                style={[
                    styles.calendarDay,
                    isPast && styles.pastDay,
                    isSelected && styles.selectedDay,
                    isToday && !isSelected && styles.todayDay
                ]}
                onPress={() => onDateSelect(date)}
            >
                <Text style={[
                    styles.dayNumber,
                    isPast && styles.pastDayText,
                    isSelected && styles.selectedDayText,
                    isToday && !isSelected && styles.todayDayText
                ]}>{i}</Text>

                <View style={styles.dayChoresContainer}>
                    {dayChores.slice(0, 3).map((chore, idx) => (
                        <Text key={idx} numberOfLines={1} style={[
                            styles.dayChoreTitle,
                            isPast && styles.pastDayChoreTitle,
                            isSelected && styles.selectedDayChoreTitle
                        ]}>
                            {chore.title}
                        </Text>
                    ))}
                    {dayChores.length > 3 && (
                        <Text style={[styles.moreChores, isSelected && styles.selectedDayChoreTitle]}>...</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    const panGesture = Gesture.Pan()
        .onEnd((e) => {
            if (e.translationX > 50) {
                runOnJS(onMonthChange)(-1); // Swipe Right -> Prev Month
            } else if (e.translationX < -50) {
                runOnJS(onMonthChange)(1); // Swipe Left -> Next Month
            }
        });

    return (
        <GestureDetector gesture={panGesture}>
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => onMonthChange(-1)}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>
                        {currentMonth.toLocaleString('nl-NL', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity onPress={() => onMonthChange(1)}>
                        <ChevronRight size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.weekdaysRow}>
                    {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                        <Text key={day} style={styles.weekdayText}>{day}</Text>
                    ))}
                </View>

                <View style={styles.gridContainer}>
                    <View style={styles.daysGrid}>
                        {days}
                    </View>
                </View>
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    calendarContainer: {
        padding: 16,
        marginBottom: 16,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        textTransform: 'capitalize',
    },
    weekdaysRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    gridContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDay: {
        width: '14.28%',
        height: 90,
        padding: 4,
        borderWidth: 0.5,
        borderColor: '#F3F4F6',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    pastDay: {
        backgroundColor: '#F3F4F6',
    },
    selectedDay: {
        backgroundColor: '#EFF6FF',
        borderColor: '#2563EB',
        borderWidth: 1,
        borderRadius: 4,
        zIndex: 1,
    },
    todayDay: {
        backgroundColor: '#F0F9FF',
        borderColor: '#BAE6FD',
        borderWidth: 1,
    },
    dayNumber: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
        color: '#374151',
    },
    pastDayText: {
        color: '#9CA3AF',
    },
    selectedDayText: {
        color: '#2563EB',
        fontWeight: 'bold',
    },
    todayDayText: {
        color: '#0284C7',
        fontWeight: 'bold',
    },
    dayChoresContainer: {
        width: '100%',
    },
    dayChoreTitle: {
        fontSize: 9,
        color: '#4B5563',
        marginBottom: 2,
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        overflow: 'hidden',
    },
    pastDayChoreTitle: {
        color: '#9CA3AF',
        backgroundColor: '#E5E7EB',
        opacity: 0.7,
    },
    selectedDayChoreTitle: {
        color: '#1E40AF',
        backgroundColor: '#DBEAFE',
    },
    moreChores: {
        fontSize: 8,
        color: '#6B7280',
        textAlign: 'center',
    },
});
