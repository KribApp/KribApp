import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
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

interface CalendarViewProps {
    currentMonth: Date;
    selectedDate: Date;
    chores: any[];
    members: any[];
    onMonthChange: (delta: number) => void;
    onDateSelect: (date: Date) => void;
}

export function CalendarView({ currentMonth, selectedDate, chores, members, onMonthChange, onDateSelect }: CalendarViewProps) {
    const { width } = useWindowDimensions();
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);

    // Reset animation when month changes
    useEffect(() => {
        translateX.value = 0;
        opacity.value = 1;
    }, [currentMonth]);

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

    const getBirthdaysForDate = (date: Date) => {
        return members.filter((m: any) => {
            const userData = Array.isArray(m.users) ? m.users[0] : m.users;
            if (!userData?.birthdate) return false;
            const birthDate = new Date(userData.birthdate);
            return birthDate.getDate() === date.getDate() &&
                birthDate.getMonth() === date.getMonth();
        }).map((m: any) => {
            const userData = Array.isArray(m.users) ? m.users[0] : m.users;
            return {
                username: userData?.username || 'Unknown',
                age: date.getFullYear() - new Date(userData.birthdate).getFullYear()
            };
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
        const dayBirthdays = getBirthdaysForDate(date);
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
                <View style={styles.dayHeader}>
                    <Text style={[
                        styles.dayNumber,
                        isPast && styles.pastDayText,
                        isSelected && styles.selectedDayText,
                        isToday && !isSelected && styles.todayDayText
                    ]}>{i}</Text>
                    {dayBirthdays.length > 0 && <Text style={styles.birthdayIcon}>🎂</Text>}
                </View>

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

    const handleMonthChange = (delta: number) => {
        // Animate out in the direction of swipe
        const targetX = delta > 0 ? -width : width;
        translateX.value = withTiming(targetX, { duration: 100 }, () => {
            runOnJS(onMonthChange)(delta);
            // Reset position from opposite side
            translateX.value = -targetX;
            translateX.value = withSpring(0, { damping: 25, stiffness: 350 });
        });
    };

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            // Follow finger during drag
            translateX.value = e.translationX * 0.5; // Reduced sensitivity
            opacity.value = interpolate(
                Math.abs(e.translationX),
                [0, 150],
                [1, 0.7],
                Extrapolation.CLAMP
            );
        })
        .onEnd((e) => {
            if (e.translationX > 80) {
                // Swipe Right -> Prev Month
                runOnJS(handleMonthChange)(-1);
            } else if (e.translationX < -80) {
                // Swipe Left -> Next Month
                runOnJS(handleMonthChange)(1);
            } else {
                // Snap back if not enough swipe
                translateX.value = withSpring(0, { damping: 25, stiffness: 350 });
                opacity.value = withTiming(1, { duration: 100 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
    }));

    return (
        <GestureDetector gesture={panGesture}>
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => handleMonthChange(-1)}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>
                        {currentMonth.toLocaleString('nl-NL', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity onPress={() => handleMonthChange(1)}>
                        <ChevronRight size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.weekdaysRow}>
                    {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                        <Text key={day} style={styles.weekdayText}>{day}</Text>
                    ))}
                </View>

                <Animated.View style={[styles.gridContainer, animatedStyle]}>
                    <View style={styles.daysGrid}>
                        {days}
                    </View>
                </Animated.View>
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
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 2,
    },
    birthdayIcon: {
        fontSize: 10,
    },
});
