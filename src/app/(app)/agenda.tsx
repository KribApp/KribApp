import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useHousehold } from '../../context/HouseholdContext';
import { StatusBar } from 'expo-status-bar';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useTheme } from '../../context/ThemeContext';
import { KribTheme } from '../../theme/theme';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar as CalendarIcon, Check, X, Clock } from 'lucide-react-native';
import { WeekCalendar } from '../../components/agenda/WeekCalendar';
import { toZonedTime, format } from 'date-fns-tz';
import { subHours } from 'date-fns';

export default function Agenda() {
    const { theme, isDarkMode } = useTheme();
    const { household, user, loading: contextLoading } = useHousehold();
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [attendance, setAttendance] = useState<any[]>([]);
    const [dailyChores, setDailyChores] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

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
            fetchEvents();
            const attendanceSub = subscribeToAttendance();
            const choresSub = subscribeToDailyChores();
            const eventsSub = subscribeToEvents();
            return () => {
                attendanceSub.unsubscribe();
                choresSub.unsubscribe();
                eventsSub.unsubscribe();
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
            let status = record?.status || 'PENDING';

            // Apply default based on household config if no record exists
            if (status === 'PENDING') {
                // Check if it is a new day (after 00:00) for the selected date
                // Since selectedDate is YYYY-MM-DD, we can assume it represents the "day"
                // The requirement: "If it is switched on, the as soon as it is a new day (so after 00:00) everyone... will be set to 'Mee eten'"
                // We can simply strictly apply the default if status is missing.
                if (household?.config_no_response_action === 'EAT') {
                    status = 'EATING';
                }
                // If default is NO_EAT, it effectively remains PENDING (or we could map it to NOT_EATING, but PENDING is clearer UI wise until they decide)
                // User request says: "except the people who have already set their status to niet mee eten". 
                // So explicit 'NOT_EATING' is respected (record exists). 
                // Missing record => Default.
            }

            return {
                user_id: member.user_id,
                // @ts-ignore
                username: member.users?.username || 'Unknown',
                status: status,
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
            .channel('dining_attendance_agenda')
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

    function subscribeToDailyChores() {
        return supabase
            .channel('daily_chores_agenda')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chores',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    fetchDailyChores();
                }
            )
            .subscribe();
    }

    async function fetchEvents() {
        if (!householdId || !selectedDate) return;

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch events that overlap with this day
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('household_id', householdId)
            .lte('start_time', endOfDay.toISOString())
            .gte('end_time', startOfDay.toISOString());

        if (data) {
            setEvents(data);
        } else {
            setEvents([]);
        }
    }

    function subscribeToEvents() {
        return supabase
            .channel('events_agenda')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'events',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    fetchEvents();
                }
            )
            .subscribe();
    }

    async function setStatus(status: 'EATING' | 'NOT_EATING') {
        if (!householdId || !userId) return;

        // Check deadline
        if (deadline) {
            const now = new Date();
            const [hours, minutes] = deadline.split(':').map(Number);
            const deadlineDate = new Date();
            deadlineDate.setHours(hours, minutes, 0, 0);

            // Compare only if selected date is TODAY
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selected = new Date(selectedDate);
            selected.setHours(0, 0, 0, 0);

            if (selected.getTime() === today.getTime() && now > deadlineDate) {
                Alert.alert(
                    "Deadline Verstreken",
                    `Je kunt je status voor vandaag niet meer wijzigen na ${deadline.substring(0, 5)}.`
                );
                return;
            }
        }

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

        let statusColor = theme.colors.text.secondary; // Gray for PENDING
        let statusText = 'Nog niet gereageerd';
        let statusIcon = <Clock size={20} color={theme.colors.text.secondary} />;

        if (item.status === 'EATING') {
            statusColor = theme.colors.success;
            statusText = 'Eet mee';
            statusIcon = <Check size={20} color={theme.colors.success} />;
        } else if (item.status === 'NOT_EATING') {
            statusColor = theme.colors.error;
            statusText = 'Eet niet mee';
            statusIcon = <X size={20} color={theme.colors.error} />;
        }

        return (
            <View style={[styles.memberRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.memberInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.border }]}>
                        <Text style={[styles.avatarText, { color: theme.colors.text.secondary }]}>{item.username.substring(0, 1).toUpperCase()}</Text>
                    </View>
                    <View>
                        <Text style={[styles.memberName, { color: theme.colors.text.primary }]}>{item.username} {isMe && '(Jij)'}</Text>
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
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "light"} />
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <DrawerToggleButton tintColor={theme.colors.onBackground} />
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Agenda</Text>
                <View style={{ width: 24 }} />
            </View>

            <WeekCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                householdId={householdId}
                timezone={timezone}
            />

            <View style={styles.content}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Planning vandaag</Text>
                <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                    {events.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[styles.subSectionTitle, { color: theme.colors.text.secondary }]}>Agenda</Text>
                            {events.map(event => (
                                <View key={event.id} style={[styles.eventItem, { backgroundColor: theme.colors.background }]}>
                                    <View style={[styles.eventBar, { backgroundColor: event.color || theme.colors.primary }]} />
                                    <View style={styles.eventContent}>
                                        <Text style={[styles.eventTitle, { color: theme.colors.text.primary }]}>{event.title}</Text>
                                        <Text style={[styles.eventTime, { color: theme.colors.text.secondary }]}>
                                            {event.is_all_day
                                                ? 'Hele dag'
                                                : `${new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            }
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                        </View>
                    )}

                    <Text style={[styles.subSectionTitle, { marginBottom: 8, color: theme.colors.text.secondary }]}>Taken</Text>
                    {dailyChores.length > 0 ? (
                        dailyChores.map(chore => (
                            <View key={chore.id} style={styles.choreItem}>
                                <View style={[styles.choreDot, { backgroundColor: theme.colors.primary }]} />
                                <View>
                                    <Text style={[styles.choreTitle, { color: theme.colors.text.primary }]}>{chore.title}</Text>
                                    {chore.users && (
                                        <Text style={[styles.choreAssignee, { color: theme.colors.text.secondary }]}>
                                            {/* @ts-ignore */}
                                            {chore.users.username}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>Geen taken gepland</Text>
                    )}
                </View>

                <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }]}>
                    <View style={styles.diningHeader}>
                        <Text style={[styles.diningTitle, { color: theme.colors.text.secondary }]}>Aantal eters</Text>
                        <Text style={[styles.diningCount, { color: theme.colors.text.primary }]}>{eatingCount}</Text>
                        <Text style={[styles.deadlineText, { color: theme.colors.error }]}>Deadline: {deadline}</Text>
                    </View>

                    {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const selected = new Date(selectedDate);
                        selected.setHours(0, 0, 0, 0);
                        const isPastDate = selected < today;
                        const item = attendance.find(a => a.user_id === userId);

                        if (!isPastDate) {
                            return (
                                <View style={[styles.segmentedControl, { backgroundColor: theme.colors.background }]}>
                                    <TouchableOpacity
                                        style={[
                                            styles.segment,
                                            item?.status === 'EATING' && [styles.segmentActive, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }],
                                            item?.status === 'EATING' && { backgroundColor: theme.colors.success + '20' }
                                        ]}
                                        onPress={() => setStatus('EATING')}
                                    >
                                        <Check size={18} color={item?.status === 'EATING' ? theme.colors.success : theme.colors.text.secondary} />
                                        <Text style={[
                                            styles.segmentText,
                                            { color: theme.colors.text.secondary },
                                            item?.status === 'EATING' && { color: theme.colors.success }
                                        ]}>
                                            Ik eet mee
                                        </Text>
                                    </TouchableOpacity>
                                    <View style={[styles.segmentDivider, { backgroundColor: theme.colors.border }]} />
                                    <TouchableOpacity
                                        style={[
                                            styles.segment,
                                            item?.status === 'NOT_EATING' && [styles.segmentActive, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }],
                                            item?.status === 'NOT_EATING' && { backgroundColor: theme.colors.error + '20' }
                                        ]}
                                        onPress={() => setStatus('NOT_EATING')}
                                    >
                                        <X size={18} color={item?.status === 'NOT_EATING' ? theme.colors.error : theme.colors.text.secondary} />
                                        <Text style={[
                                            styles.segmentText,
                                            { color: theme.colors.text.secondary },
                                            item?.status === 'NOT_EATING' && { color: theme.colors.error }
                                        ]}>
                                            Ik eet niet mee
                                        </Text>
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
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: KribTheme.colors.background,
        borderRadius: KribTheme.borderRadius.m,
        padding: 4,
        marginBottom: 24,
        height: 48,
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: KribTheme.borderRadius.s,
        gap: 8,
    },
    segmentActive: {
        backgroundColor: KribTheme.colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    segmentDivider: {
        width: 1,
        backgroundColor: KribTheme.colors.border,
        marginVertical: 8,
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
    subSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: KribTheme.colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    eventItem: {
        flexDirection: 'row',
        marginBottom: 8,
        backgroundColor: KribTheme.colors.background,
        borderRadius: 8,
        overflow: 'hidden',
    },
    eventBar: {
        width: 6,
        backgroundColor: KribTheme.colors.primary,
    },
    eventContent: {
        padding: 8,
        flex: 1,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: KribTheme.colors.text.primary,
        marginBottom: 2,
    },
    eventTime: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    divider: {
        height: 1,
        backgroundColor: KribTheme.colors.border,
        marginVertical: 12,
    },
});
