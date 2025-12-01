import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, getISOWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../services/supabase';

interface WeekCalendarProps {
    selectedDate: string;
    onSelectDate: (date: string) => void;
    householdId: string | null;
    timezone: string;
}

export function WeekCalendar({ selectedDate, onSelectDate, householdId, timezone }: WeekCalendarProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(
        startOfWeek(new Date(selectedDate || new Date()), { weekStartsOn: 1 })
    );
    const [choreDates, setChoreDates] = useState<string[]>([]);

    useEffect(() => {
        if (selectedDate) {
            // Ensure the calendar shows the week of the selected date if it changes externally
            const selected = new Date(selectedDate);
            const start = startOfWeek(selected, { weekStartsOn: 1 });
            if (start.getTime() !== currentWeekStart.getTime()) {
                setCurrentWeekStart(start);
            }
        }
    }, [selectedDate]);

    useEffect(() => {
        if (householdId) {
            fetchChoresForWeek();
        }
    }, [householdId, currentWeekStart]);

    async function fetchChoresForWeek() {
        if (!householdId) return;

        const start = currentWeekStart.toISOString();
        const end = addDays(currentWeekStart, 7).toISOString();

        const { data, error } = await supabase
            .from('chores')
            .select('due_date')
            .eq('household_id', householdId)
            .gte('due_date', start)
            .lt('due_date', end);

        if (data) {
            const dates = data.map(c => {
                if (!c.due_date) return '';
                // Convert UTC timestamp to household timezone
                const zonedDate = toZonedTime(c.due_date, timezone);
                return format(zonedDate, 'yyyy-MM-dd');
            }).filter(Boolean);
            setChoreDates([...new Set(dates)]);
        }
    }

    function handlePrevWeek() {
        setCurrentWeekStart(prev => subWeeks(prev, 1));
    }

    function handleNextWeek() {
        setCurrentWeekStart(prev => addWeeks(prev, 1));
    }

    const weekNumber = getISOWeek(currentWeekStart);
    const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handlePrevWeek} style={styles.arrowButton}>
                    <ChevronLeft size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.weekText}>Week {weekNumber}</Text>
                <TouchableOpacity onPress={handleNextWeek} style={styles.arrowButton}>
                    <ChevronRight size={20} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <View style={styles.daysContainer}>
                {days.map((day) => {
                    const dateString = format(day, 'yyyy-MM-dd');
                    const isSelected = selectedDate === dateString;
                    const hasChore = choreDates.includes(dateString);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <TouchableOpacity
                            key={dateString}
                            style={[
                                styles.dayButton,
                                isSelected && styles.dayButtonSelected,
                                isToday && !isSelected && styles.dayButtonToday
                            ]}
                            onPress={() => onSelectDate(dateString)}
                        >
                            <Text style={[styles.dayName, isSelected && styles.textSelected]}>
                                {format(day, 'EEE', { locale: nl })}
                            </Text>
                            <Text style={[styles.dayNumber, isSelected && styles.textSelected]}>
                                {format(day, 'd')}
                            </Text>
                            {hasChore && (
                                <View style={[styles.dot, isSelected && styles.dotSelected]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 16,
    },
    weekText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    arrowButton: {
        padding: 4,
    },
    daysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
    },
    dayButton: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 12,
        minWidth: 40,
    },
    dayButtonSelected: {
        backgroundColor: '#2563EB',
    },
    dayButtonToday: {
        backgroundColor: '#F3F4F6',
    },
    dayName: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        textTransform: 'capitalize',
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    textSelected: {
        color: '#FFFFFF',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#3B82F6',
        marginTop: 4,
    },
    dotSelected: {
        backgroundColor: '#FFFFFF',
    },
});
