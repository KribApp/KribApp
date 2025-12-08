import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';

export default function Index() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) {
                setLoading(false);
                router.replace('/(auth)/login');
            } else {
                checkHousehold(session.user.id);
            }
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) checkHousehold(session.user.id);
            else if (!loading) router.replace('/(auth)/login');
        });
    }, []);

    async function checkHousehold(userId: string) {
        // 1. Check if user profile exists in public.users
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (!profile) {
            // Profile missing (e.g. after DB reset). 
            // Sign out and redirect to login.
            await supabase.auth.signOut();
            setLoading(false);
            router.replace('/(auth)/login');
            return;
        }

        // 2. Check if user is in any household
        const { data, error } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', userId)
            .limit(1);

        setLoading(false);

        if (data && data.length > 0) {
            router.replace('/(app)/dashboard');
        } else {
            // User is logged in but has no household
            router.replace('/(auth)/household-start');
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Image
                    source={require('../../assets/krib-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <ActivityIndicator size="large" color="#5D5FEF" />
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 32,
    },
});
