import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { List } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../context/ThemeContext';
import { KribTheme } from '../../theme/theme';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useChoresData } from '../../hooks/useChoresData';
import { CalendarView } from '../../components/chores/CalendarView';
import { DayDetail } from '../../components/chores/DayDetail';
import { TaskListModal } from '../../components/chores/TaskListModal';
import { AssignmentModal } from '../../components/chores/AssignmentModal';
import { MyTodoList } from '../../components/chores/MyTodoList';

export default function Huishouden() {
    const { theme, isDarkMode } = useTheme();
    const {
        householdId,
        userRole,
        chores,
        setChores,
        templates,
        setTemplates,
        members,
        fetchChores,
        fetchTemplates,
        userId
    } = useChoresData();

    // Tabs
    const [activeTab, setActiveTab] = useState<'MY_TASKS' | 'CALENDAR'>('MY_TASKS');

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Task List (Templates) Modal State
    const [showTaskList, setShowTaskList] = useState(false);

    // Assignment Modal State
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [selectedTemplateForAssignment, setSelectedTemplateForAssignment] = useState<any | null>(null);

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentMonth(newDate);
    };

    // --- Template Actions ---

    async function addTemplate(title: string) {
        if (!title.trim()) {
            Alert.alert('Fout', 'Vul een titel in.');
            return;
        }

        if (!householdId) {
            Alert.alert('Error', 'Geen huishouden gevonden.');
            return;
        }

        // Optimistic update
        const tempId = Math.random().toString();
        const newTemplate = { id: tempId, household_id: householdId, title, points: 10 };
        setTemplates(prev => [...prev, newTemplate].sort((a, b) => a.title.localeCompare(b.title)));

        const { data, error } = await supabase
            .from('chore_templates')
            .insert([{ household_id: householdId, title, points: 10 }])
            .select()
            .single();

        if (error) {
            Alert.alert('Error', `Kon sjabloon niet toevoegen: ${error.message}`);
            console.error(error);
            // Revert
            setTemplates(prev => prev.filter(t => t.id !== tempId));
        } else if (data) {
            // Replace temp with real
            setTemplates(prev => prev.map(t => t.id === tempId ? data : t).sort((a, b) => a.title.localeCompare(b.title)));
        }
    }

    async function deleteTemplate(id: string) {
        // Optimistic update: Remove template AND linked chores
        setTemplates(prev => prev.filter(t => t.id !== id));
        setChores(prev => prev.filter(c => c.template_id !== id));

        const { error } = await supabase
            .from('chore_templates')
            .delete()
            .eq('id', id);

        if (error) {
            Alert.alert('Error', 'Kon sjabloon niet verwijderen.');
            // Revert
            fetchTemplates();
            fetchChores();
        }
    }

    // --- Assignment Actions ---

    async function assignTask(memberId: string) {
        const templateToAssign = selectedTemplateForAssignment;
        if (!templateToAssign || !householdId) {
            Alert.alert('Error', 'Geen taak of huishouden geselecteerd.');
            return;
        }

        // Optimistic update
        const tempId = Math.random().toString();
        const newChore = {
            id: tempId,
            household_id: householdId,
            title: templateToAssign.title,
            assigned_to_user_id: memberId,
            status: 'PENDING',
            points: templateToAssign.points,
            due_date: selectedDate.toISOString(),
            template_id: templateToAssign.id,
            assigned_to: members.find(m => m.user_id === memberId)?.users
        };

        setChores(prev => [...prev, newChore].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
        setShowAssignmentModal(false);
        setSelectedTemplateForAssignment(null);

        try {
            const { data, error } = await supabase
                .from('chores')
                .insert([{
                    household_id: householdId,
                    title: templateToAssign.title,
                    assigned_to_user_id: memberId,
                    status: 'PENDING',
                    points: templateToAssign.points,
                    due_date: selectedDate.toISOString(),
                    template_id: templateToAssign.id,
                }])
                .select('*, assigned_to:users(username)')
                .single();

            if (error) throw error;

            if (data) {
                // Replace temp with real
                setChores(prev => prev.map(c => c.id === tempId ? data : c));
            }
        } catch (error: any) {
            Alert.alert('Error', `Kon taak niet toewijzen: ${error.message}`);
            // Revert
            setChores(prev => prev.filter(c => c.id !== tempId));
        }
    }

    async function toggleChoreStatus(chore: any) {
        const newStatus = chore.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        const isCompleting = newStatus === 'COMPLETED';

        // Optimistic
        setChores(prev => prev.map(c => c.id === chore.id ? { ...c, status: newStatus } : c));

        const updates: any = { status: newStatus };

        // Handle recurrence if completing
        if (isCompleting && chore.recurrence_rule && chore.due_date) {
            handleRecurrence(chore);
        }

        const { error } = await supabase
            .from('chores')
            .update(updates)
            .eq('id', chore.id);

        if (error) {
            // Revert
            setChores(prev => prev.map(c => c.id === chore.id ? { ...c, status: chore.status } : c));
            Alert.alert('Error', 'Kon taak niet updaten.');
        }
    }

    async function handleRecurrence(chore: any) {
        if (!householdId) return;

        let nextDueDate = new Date(chore.due_date);

        switch (chore.recurrence_rule) {
            case 'DAILY':
                nextDueDate.setDate(nextDueDate.getDate() + 1);
                break;
            case 'WEEKLY':
                nextDueDate.setDate(nextDueDate.getDate() + 7);
                break;
            case 'MONTHLY':
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                break;
            default:
                return; // Unknown rule, do nothing
        }

        // Create next task
        // We'll create it assigned to the SAME user, or unassigned? 
        // For now, let's keep it assigned to same user to keep flow simple.
        const nextChore = {
            household_id: householdId,
            title: chore.title, // Keep same title
            assigned_to_user_id: chore.assigned_to_user_id,
            status: 'PENDING',
            points: chore.points,
            due_date: nextDueDate.toISOString(),
            template_id: chore.template_id,
            recurrence_rule: chore.recurrence_rule
        };

        const { data, error } = await supabase
            .from('chores')
            .insert([nextChore])
            .select('*, assigned_to:users(username)')
            .single();

        if (data) {
            setChores(prev => [...prev, data]);
        }
    }

    async function deleteChore(chore: any) {
        // Optimistic
        setChores(prev => prev.filter(c => c.id !== chore.id));

        const { error } = await supabase
            .from('chores')
            .delete()
            .eq('id', chore.id);

        if (error) {
            Alert.alert('Error', 'Kon taak niet verwijderen.');
            // Revert
            fetchChores();
        }
    }

    const canManage = userRole === 'ADMIN' || userRole === 'CORVEE_PLANNER';

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "light"} />
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <DrawerToggleButton tintColor={theme.colors.onBackground} />
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Huishouden</Text>
                <TouchableOpacity
                    style={styles.taskListButton}
                    onPress={() => setShowTaskList(true)}
                >
                    <List size={24} color={theme.colors.onBackground} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }, activeTab === 'MY_TASKS' && [styles.activeTab, { backgroundColor: theme.colors.primary }]]}
                    onPress={() => setActiveTab('MY_TASKS')}
                >
                    <Text style={[styles.tabText, { color: theme.colors.text.secondary }, activeTab === 'MY_TASKS' && [styles.activeTabText, { color: theme.colors.text.inverse }]]}>Mijn Taken</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, { backgroundColor: theme.colors.surface, shadowColor: theme.shadows.card.shadowColor }, activeTab === 'CALENDAR' && [styles.activeTab, { backgroundColor: theme.colors.primary }]]}
                    onPress={() => setActiveTab('CALENDAR')}
                >
                    <Text style={[styles.tabText, { color: theme.colors.text.secondary }, activeTab === 'CALENDAR' && [styles.activeTabText, { color: theme.colors.text.inverse }]]}>Schema</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'MY_TASKS' ? (
                <View style={styles.content}>
                    <MyTodoList
                        chores={chores}
                        userId={userId}
                        onToggleStatus={toggleChoreStatus}
                    />
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    <CalendarView
                        currentMonth={currentMonth}
                        selectedDate={selectedDate}
                        chores={chores}
                        onMonthChange={changeMonth}
                        onDateSelect={setSelectedDate}
                    />
                    <DayDetail
                        selectedDate={selectedDate}
                        chores={chores}
                        canManage={canManage}
                        onAssignTask={() => setShowAssignmentModal(true)}
                        onToggleStatus={toggleChoreStatus}
                        onDeleteChore={deleteChore}
                    />
                </ScrollView>
            )}

            <TaskListModal
                visible={showTaskList}
                onClose={() => setShowTaskList(false)}
                templates={templates}
                canManage={canManage}
                onAddTemplate={addTemplate}
                onDeleteTemplate={deleteTemplate}
            />

            <AssignmentModal
                visible={showAssignmentModal}
                onClose={() => {
                    setShowAssignmentModal(false);
                    setSelectedTemplateForAssignment(null);
                }}
                templates={templates}
                members={members}
                selectedTemplate={selectedTemplateForAssignment}
                onSelectTemplate={setSelectedTemplateForAssignment}
                onAssign={assignTask}
            />
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
    taskListButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    activeTab: {
        backgroundColor: KribTheme.colors.primary,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.secondary,
    },
    activeTabText: {
        color: KribTheme.colors.text.inverse,
    },
    selectedDateSection: {
        padding: 16,
        backgroundColor: KribTheme.colors.background,
    },
    selectedDateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    selectedDateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    assignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: KribTheme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: KribTheme.borderRadius.m,
        gap: 8,
    },
    assignButtonText: {
        color: KribTheme.colors.text.inverse,
        fontWeight: '600',
        fontSize: 14,
    },
    emptyText: {
        color: KribTheme.colors.text.secondary,
        fontStyle: 'italic',
        marginTop: 8,
    },
    choreItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.l,
        marginBottom: 12,
        ...KribTheme.shadows.card,
    },
    choreContent: {
        flex: 1,
    },
    choreTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.primary,
        marginBottom: 4,
    },
    choreAssignee: {
        fontSize: 14,
        color: KribTheme.colors.text.secondary,
    },
    deleteButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.xl,
        padding: 24,
        maxHeight: '80%',
        ...KribTheme.shadows.floating,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24,
        color: KribTheme.colors.text.primary,
        textAlign: 'center',
    },
    input: {
        backgroundColor: KribTheme.colors.background,
        borderRadius: KribTheme.borderRadius.m,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        color: KribTheme.colors.text.primary,
    },
    userSelectTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: KribTheme.colors.text.primary,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: KribTheme.borderRadius.m,
        marginBottom: 8,
        backgroundColor: KribTheme.colors.background,
    },
    selectedUserItem: {
        backgroundColor: KribTheme.colors.primary,
    },
    userItemText: {
        fontSize: 16,
        color: KribTheme.colors.text.primary,
    },
    selectedUserItemText: {
        color: KribTheme.colors.text.inverse,
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
    modalButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: KribTheme.borderRadius.m,
    },
    cancelButton: {
        backgroundColor: KribTheme.colors.background,
    },
    saveButton: {
        backgroundColor: KribTheme.colors.primary,
    },
    cancelButtonText: {
        color: KribTheme.colors.text.primary,
        fontWeight: '600',
    },
    saveButtonText: {
        color: KribTheme.colors.text.inverse,
        fontWeight: '600',
    },
});
