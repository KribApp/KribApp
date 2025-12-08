import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useHousehold } from '../../context/HouseholdContext';
import { StatusBar } from 'expo-status-bar';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { KribTheme } from '../../theme/theme';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar as CalendarIcon, Check, X, Clock } from 'lucide-react-native';
import { WeekCalendar } from '../../components/agenda/WeekCalendar';
import { toZonedTime, format } from 'date-fns-tz';
import { subHours } from 'date-fns';

export default function Agenda() {
    const { household, user, loading: contextLoading } = useHousehold();
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [attendance, setAttendance] = useState<any[]>([]);
    const [dailyChores, setDailyChores] = useState<any[]>([]);

    const householdId = household?.id || null;
    const userId = user?.id || null;
    const deadline = household?.config_deadline_time || '16:00:00';
    const timezone = household?.timezone || 'Europe/Amsterdam';

    useEffect(() => {
        if (household) {
            // Calculate date based on timezone and 01:00 rule
            const now = new Date();
            const zonedNow = toZonedTime(now, timezone);
            const effectiveDate = subHours(zonedNow, 1); // Shift back 1 hour so 00:59 is still previous day
            const dateString = format(effectiveDate, 'yyyy-MM-dd', { timeZone: timezone });
            setSelectedDate(dateString);
        }
    }, [household, timezone]);

    useEffect(() => {
        if (householdId && selectedDate) {
            fetchAttendance();
            fetchDailyChores();
            const subscription = subscribeToAttendance();
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [householdId, selectedDate]);

    async function fetchAttendance() {
        if (!householdId || !selectedDate) return;
        setLoading(true);

        // 1. Get all members
        const { data: members, error: membersError } = await supabase
            .from('household_members')
            .select('user_id, users(username, profile_picture_url)')
            .eq('household_id', householdId);

        if (membersError || !members) {
            setLoading(false);
            return;
        }

        // 2. Get existing attendance records for date
        const { data: records, error: recordsError } = await supabase
            .from('dining_attendance')
            .select('*')
            .eq('household_id', householdId)
            .eq('date', selectedDate);

        // 3. Merge data
        const merged = members.map(member => {
            const record = records?.find(r => r.user_id === member.user_id);
            return {
                user_id: member.user_id,
                // @ts-ignore
                username: member.users?.username || 'Unknown',
                status: record?.status || 'PENDING',
                record_id: record?.id
            };
        });

        setAttendance(merged);
        setLoading(false);
    }

    async function fetchDailyChores() {
        if (!householdId || !selectedDate) return;

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: choresData, error: choresError } = await supabase
            .from('chores')
            .select('id, title, assigned_to_user_id, users(username)')
            .eq('household_id', householdId)
            .gte('due_date', startOfDay.toISOString())
            .lte('due_date', endOfDay.toISOString());

        if (choresData) {
            setDailyChores(choresData);
        } else {
            setDailyChores([]);
        }
    }

    function subscribeToAttendance() {
        return supabase
            .channel('dining_attendance')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'dining_attendance',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    fetchAttendance();
                }
            )
            .subscribe();
    }

    async function setStatus(status: 'EATING' | 'NOT_EATING') {
        if (!householdId || !userId) return;

        // Optimistic update
        const previousAttendance = [...attendance];
        setAttendance(prev => prev.map(item => {
            if (item.user_id === userId) {
                return { ...item, status };
            }
            return item;
        }));

        const { error } = await supabase
            .from('dining_attendance')
            .upsert([
                {
                    household_id: householdId,
                    user_id: userId,
                    date: selectedDate,
                    status: status,
                    updated_at: new Date().toISOString(),
                }
            ], { onConflict: 'household_id, user_id, date' });

        if (error) {
            Alert.alert('Error', error.message);
            setAttendance(previousAttendance);
        }
    }

    const eatingCount = attendance.filter(a => a.status === 'EATING').length;

    const renderItem = ({ item }: { item: any }) => {
        const isMe = item.user_id === userId;

        let statusColor = KribTheme.colors.text.secondary; // Gray for PENDING
        let statusText = 'Nog niet gereageerd';
        let statusIcon = <Clock size={20} color={KribTheme.colors.text.secondary} />;

        if (item.status === 'EATING') {
            statusColor = KribTheme.colors.success;
            statusText = 'Eet mee';
            statusIcon = <Check size={20} color={KribTheme.colors.success} />;
        } else if (item.status === 'NOT_EATING') {
            statusColor = KribTheme.colors.error;
            statusText = 'Eet niet mee';
            statusIcon = <X size={20} color={KribTheme.colors.error} />;
        }

        return (
            <View style={styles.memberRow}>
                <View style={styles.memberInfo}>
                    <View style={[styles.avatar, { backgroundColor: KribTheme.colors.border }]}>
                        <Text style={styles.avatarText}>{item.username.substring(0, 1).toUpperCase()}</Text>
                    </View>
                    <View>
                        <Text style={styles.memberName}>{item.username} {isMe && '(Jij)'}</Text>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                </View>
                <View>
                    {statusIcon}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <DrawerToggleButton tintColor="#FFFFFF" />
                <Text style={styles.headerTitle}>Agenda</Text>
                <View style={{ width: 24 }} />
            </View>

            <WeekCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                householdId={householdId}
                timezone={timezone}
            />

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Planning vandaag</Text>
                <View style={styles.sectionCard}>
                    {dailyChores.length > 0 ? (
                        dailyChores.map(chore => (
                            <View key={chore.id} style={styles.choreItem}>
                                <View style={styles.choreDot} />
                                <View>
                                    <Text style={styles.choreTitle}>{chore.title}</Text>
                                    {chore.users && (
                                        <Text style={styles.choreAssignee}>
                                            {/* @ts-ignore */}
                                            {chore.users.username}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Geen taken gepland</Text>
                    )}
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.diningHeader}>
                        <Text style={styles.diningTitle}>Aantal eters</Text>
                        <Text style={styles.diningCount}>{eatingCount}</Text>
                        <Text style={styles.deadlineText}>Deadline: {deadline}</Text>
                    </View>

                    {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const selected = new Date(selectedDate);
                        selected.setHours(0, 0, 0, 0);
                        const isPastDate = selected < today;

                        if (!isPastDate) {
                            return (
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.joinButton]}
                                        onPress={() => setStatus('EATING')}
                                    >
                                        <Check size={20} color={KribTheme.colors.text.inverse} />
                                        <Text style={styles.buttonText}>Ik eet mee</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.leaveButton]}
                                        onPress={() => setStatus('NOT_EATING')}
                                    >
                                        <X size={20} color={KribTheme.colors.text.inverse} />
                                        <Text style={styles.buttonText}>Ik eet niet mee</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }
                        return null;
                    })()}

                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={attendance}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.user_id}
                            scrollEnabled={false} // To prevent nested scrolling issues
                        />
                    )}
                </View>
            </View>
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
    content: {
        padding: 16,
    },
    sectionCard: {
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.l,
        padding: 16,
        marginBottom: 16,
        ...KribTheme.shadows.card,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        marginLeft: 4,
    },
    emptyText: {
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
    },
    diningHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    diningTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: KribTheme.colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    diningCount: {
        fontSize: 48,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
        lineHeight: 56,
    },
    deadlineText: {
        fontSize: 12,
        color: KribTheme.colors.error,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: KribTheme.borderRadius.m,
        gap: 8,
    },
    joinButton: {
        backgroundColor: KribTheme.colors.success,
    },
    leaveButton: {
        backgroundColor: KribTheme.colors.error,
    },
    buttonText: {
        color: KribTheme.colors.text.inverse,
        fontWeight: '600',
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.5,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: KribTheme.colors.border,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: KribTheme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.secondary,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
        color: KribTheme.colors.text.primary,
    },
    statusText: {
        fontSize: 14,
        color: KribTheme.colors.text.secondary,
    },
    choreItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    choreDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: KribTheme.colors.primary,
        marginRight: 12,
    },
    choreTitle: {
        fontSize: 14,
        color: KribTheme.colors.text.primary,
        fontWeight: '500',
    },
    choreAssignee: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
});
