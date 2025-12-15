import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useFocusEffect } from 'expo-router';
import { Alert } from 'react-native';
import { useHousehold } from '../context/HouseholdContext';
import { Notification } from '../types/models';

export function useDashboardData() {
    const { household, loading: contextLoading } = useHousehold();
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<Notification[]>([]);
    const [eatingCount, setEatingCount] = useState<number | null>(null);

    const householdId = household?.id || null;
    const householdName = household?.name || 'Laden...';
    const photoUrl = household?.photo_url || null;

    useFocusEffect(
        useCallback(() => {
            if (householdId) {
                fetchDiningStatus();
                fetchAlerts();
            }
        }, [householdId])
    );

    useEffect(() => {
        if (!contextLoading && !householdId) {
            setLoading(false);
        }
    }, [contextLoading, householdId]);

    useEffect(() => {
        if (householdId) {
            // Subscriptions handle real-time updates
            // Initial fetch is handled by useFocusEffect
            const chatSub = subscribeToAlerts();
            const diningSub = subscribeToDining();

            return () => {
                chatSub.unsubscribe();
                diningSub.unsubscribe();
            };
        }
    }, [householdId]);

    async function fetchAlerts() {
        if (!householdId) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('household_id', householdId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            setAlerts(data);
            setLoading(false);
        }
    }

    async function fetchDiningStatus() {
        if (!householdId) return;
        const today = new Date().toISOString().split('T')[0];

        const { count, error } = await supabase
            .from('dining_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('household_id', householdId)
            .eq('date', today)
            .eq('status', 'EATING');

        if (!error) {
            setEatingCount(count);
        }
    }

    function subscribeToDining() {
        return supabase
            .channel('dining_status_dashboard')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'dining_attendance',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    fetchDiningStatus();
                }
            )
            .subscribe();
    }

    function subscribeToAlerts() {
        return supabase
            .channel('dashboard_alerts')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `household_id=eq.${householdId}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    if (payload.eventType === 'INSERT') {
                        setAlerts((prev) => [newNotification, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setAlerts((prev) => prev.map(a => a.id === newNotification.id ? newNotification : a));
                    }
                }
            )
            .subscribe();
    }

    async function resolveAlert(alertId: string, relatedEntityId?: string | null) {

        // Optimistic update: Mark as resolved immediately
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));

        // 1. Mark notification as resolved
        const { error: notifError } = await supabase
            .from('notifications')
            .update({ is_resolved: true })
            .eq('id', alertId);

        if (notifError) {
            console.error('Error resolving notification:', notifError);
            // Revert optimistic update if needed, but for now just log
            return;
        }

        // 2. If linked to a shopping item, mark it as checked (bought)
        if (relatedEntityId) {
            const { data, error: itemError } = await supabase
                .from('shopping_items')
                .update({ is_checked: true })
                .eq('id', relatedEntityId)
                .select();

            if (itemError) {
                console.error('Error updating shopping item:', itemError);
                Alert.alert('Fout', 'Kon shopping item niet updaten. Check je internet of rechten.');
            } else {
                // Success
            }
        }
    }

    return {
        householdName,
        householdId,
        photoUrl,
        loading: loading || contextLoading,
        alerts,
        eatingCount,
        hasHousehold: !!householdId,
        resolveAlert
    };
}
