import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useChoresData() {
    const [loading, setLoading] = useState(true);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    // Data
    const [chores, setChores] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);

    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    useEffect(() => {
        if (householdId) {
            fetchChores();
            fetchTemplates();
            fetchMembers();

            const choreSubscription = subscribeToChores();
            const templateSubscription = subscribeToTemplates();
            const usersSubscription = subscribeToUsers();

            return () => {
                choreSubscription.unsubscribe();
                templateSubscription.unsubscribe();
                usersSubscription.unsubscribe();
            };
        }
    }, [householdId]);

    async function fetchHouseholdAndUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: member } = await supabase
            .from('household_members')
            .select('household_id, role')
            .eq('user_id', user.id)
            .single();

        if (member) {
            setHouseholdId(member.household_id);
            setUserRole(member.role);
        }
    }

    async function fetchMembers() {
        if (!householdId) return;
        const { data } = await supabase
            .from('household_members')
            .select('user_id, users(username, profile_picture_url, birthdate)')
            .eq('household_id', householdId);

        if (data) {
            setMembers(data);
        }
    }

    async function fetchChores() {
        if (!householdId) return;
        const { data } = await supabase
            .from('chores')
            .select('*, assigned_to:users(username)')
            .eq('household_id', householdId)
            .order('due_date', { ascending: true });

        if (data) {
            setChores(data);
            setLoading(false);
        }
    }

    async function fetchTemplates() {
        if (!householdId) return;
        const { data } = await supabase
            .from('chore_templates')
            .select('*')
            .eq('household_id', householdId)
            .order('title', { ascending: true });

        if (data) {
            setTemplates(data);
        }
    }

    function subscribeToChores() {
        return supabase
            .channel('chores')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chores', filter: `household_id=eq.${householdId}` }, () => fetchChores())
            .subscribe();
    }

    function subscribeToTemplates() {
        return supabase
            .channel('chore_templates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_templates', filter: `household_id=eq.${householdId}` }, () => fetchTemplates())
            .subscribe();
    }

    function subscribeToUsers() {
        return supabase
            .channel('users_chores')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => fetchMembers())
            .subscribe();
    }

    return {
        loading,
        householdId,
        userId,
        userRole,
        chores,
        setChores,
        templates,
        setTemplates,
        members,
        fetchChores,
        fetchTemplates
    };
}
