import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, getISOWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';
import { KribTheme } from '../../theme/theme';

interface WeekCalendarProps {
    selectedDate: string;
    onSelectDate: (date: string) => void;
    householdId: string | null;
    timezone: string;
    onGoToToday?: () => void;
}

export function WeekCalendar({ selectedDate, onSelectDate, householdId, timezone, onGoToToday }: WeekCalendarProps) {
    const { width } = useWindowDimensions();
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);

    const [currentWeekStart, setCurrentWeekStart] = useState(
        startOfWeek(new Date(selectedDate || new Date()), { weekStartsOn: 1 })
    );
    const [choreDates, setChoreDates] = useState<string[]>([]);
    const [birthdayDates, setBirthdayDates] = useState<string[]>([]);

    // Reset animation when week changes
    useEffect(() => {
        translateX.value = 0;
        opacity.value = 1;
    }, [currentWeekStart]);

    useEffect(() => {
        if (selectedDate) {
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
            fetchBirthdaysForWeek();
        }
    }, [householdId, currentWeekStart]);

    // Real-time subscription for user updates (birthdays)
    useEffect(() => {
        if (!householdId) return;

        const usersSubscription = supabase
            .channel('week_calendar_users')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                },
                () => {
                    fetchBirthdaysForWeek();
                }
            )
            .subscribe();

        return () => {
            usersSubscription.unsubscribe();
        };
    }, [householdId]);

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
                const zonedDate = toZonedTime(c.due_date, timezone);
                return format(zonedDate, 'yyyy-MM-dd');
            }).filter(Boolean);
            setChoreDates([...new Set(dates)]);
        }
    }

    async function fetchBirthdaysForWeek() {
        if (!householdId) return;

        const { data: members } = await supabase
            .from('household_members')
            .select('user_id, users(birthdate)')
            .eq('household_id', householdId);

        if (members) {
            const birthdays: string[] = [];
            days.forEach(day => {
                const dayMonth = day.getMonth();
                const dayDate = day.getDate();
                members.forEach((m: any) => {
                    const userData = Array.isArray(m.users) ? m.users[0] : m.users;
                    if (!userData?.birthdate) return;
                    const bday = new Date(userData.birthdate);
                    if (bday.getMonth() === dayMonth && bday.getDate() === dayDate) {
                        birthdays.push(format(day, 'yyyy-MM-dd'));
                    }
                });
            });
            setBirthdayDates([...new Set(birthdays)]);
        }
    }

    const performWeekChange = (delta: number) => {
        setCurrentWeekStart(prev => delta > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    };

    const handleWeekChange = (delta: number) => {
        const targetX = delta > 0 ? -width : width;
        translateX.value = withTiming(targetX, { duration: 100 }, () => {
            runOnJS(performWeekChange)(delta);
            translateX.value = -targetX;
            translateX.value = withSpring(0, { damping: 25, stiffness: 350 });
        });
    };

    const performGoToToday = (dateTimestamp: number, dateString: string) => {
        setCurrentWeekStart(new Date(dateTimestamp));
        onSelectDate(dateString);
        onGoToToday?.();
    };

    const handleGoToToday = () => {
        const today = new Date();
        const todayString = format(today, 'yyyy-MM-dd');
        const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
        const todayWeekStartTimestamp = todayWeekStart.getTime();

        if (todayWeekStart.getTime() !== currentWeekStart.getTime()) {
            // Animate to today's week
            const isForward = todayWeekStart > currentWeekStart;
            const targetX = isForward ? -width : width;
            translateX.value = withTiming(targetX, { duration: 100 }, () => {
                runOnJS(performGoToToday)(todayWeekStartTimestamp, todayString);
                translateX.value = -targetX;
                translateX.value = withSpring(0, { damping: 25, stiffness: 350 });
            });
        } else {
            onSelectDate(todayString);
            onGoToToday?.();
        }
    };

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = e.translationX * 0.5;
            opacity.value = interpolate(
                Math.abs(e.translationX),
                [0, 150],
                [1, 0.7],
                Extrapolation.CLAMP
            );
        })
        .onEnd((e) => {
            if (e.translationX > 80) {
                runOnJS(handleWeekChange)(-1);
            } else if (e.translationX < -80) {
                runOnJS(handleWeekChange)(1);
            } else {
                translateX.value = withSpring(0, { damping: 25, stiffness: 350 });
                opacity.value = withTiming(1, { duration: 100 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
    }));

    const weekNumber = getISOWeek(currentWeekStart);
    const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    // Check if today is visible in current week
    const today = new Date();
    const todayInCurrentWeek = days.some(day => isSameDay(day, today));

    return (
        <GestureDetector gesture={panGesture}>
            <View style={styles.container}>
                <Text style={styles.monthText}>
                    {format(currentWeekStart, 'MMMM yyyy', { locale: nl })}
                </Text>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => handleWeekChange(-1)} style={styles.arrowButton}>
                        <ChevronLeft size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.weekText}>Week {weekNumber}</Text>
                    <TouchableOpacity onPress={() => handleWeekChange(1)} style={styles.arrowButton}>
                        <ChevronRight size={20} color="#6B7280" />
                    </TouchableOpacity>

                    {/* Go to Today button */}
                    {!todayInCurrentWeek && (
                        <TouchableOpacity onPress={handleGoToToday} style={styles.todayButton}>
                            <CalendarCheck size={16} color={KribTheme.colors.primary} />
                            <Text style={styles.todayButtonText}>Vandaag</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Animated.View style={[styles.daysContainer, animatedStyle]}>
                    {days.map((day) => {
                        const dateString = format(day, 'yyyy-MM-dd');
                        const isSelected = selectedDate === dateString;
                        const hasChore = choreDates.includes(dateString);
                        const hasBirthday = birthdayDates.includes(dateString);
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
                                <View style={styles.dotsContainer}>
                                    {hasChore && (
                                        <View style={[styles.dot, isSelected && styles.dotSelected]} />
                                    )}
                                    {hasBirthday && (
                                        <View style={[styles.dot, styles.dotBirthday, isSelected && styles.dotSelected]} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>
            </View>
        </GestureDetector>
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
        paddingHorizontal: 16,
    },
    monthText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        textTransform: 'capitalize',
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    weekText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    arrowButton: {
        padding: 4,
    },
    todayButton: {
        position: 'absolute',
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    todayButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: KribTheme.colors.primary,
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
    },
    dotSelected: {
        backgroundColor: '#FFFFFF',
    },
    dotBirthday: {
        backgroundColor: '#F59E0B',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 3,
        marginTop: 4,
        minHeight: 4,
    },
});
