import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Database } from '../types/database.types';
import { router } from 'expo-router';

type UserProfile = Database['public']['Tables']['users']['Row'];
type Household = Database['public']['Tables']['households']['Row'];
type Member = Database['public']['Tables']['household_members']['Row'];

interface HouseholdContextType {
    user: UserProfile | null;
    household: Household | null;
    member: Member | null;
    loading: boolean;
    refreshHousehold: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType>({
    user: null,
    household: null,
    member: null,
    loading: true,
    refreshHousehold: async () => { },
});

export function useHousehold() {
    return useContext(HouseholdContext);
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [household, setHousehold] = useState<Household | null>(null);
    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchData();
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setHousehold(null);
                setMember(null);
                setLoading(false);
                router.replace('/(auth)/login');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    async function fetchData() {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                setLoading(false);
                return;
            }

            // 1. Fetch User Profile
            const { data: userProfile, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

            if (userError) {
                console.error('Error fetching user profile:', userError);
            } else if (!userProfile) {
                // User exists in Auth but not in public.users (e.g. after DB reset)
                console.warn('User profile not found. Signing out.');
                alert('Account Error: Your user profile was not found. Please register again.');
                await supabase.auth.signOut();
                router.replace('/(auth)/login');
                return;
            } else {
                setUser(userProfile);
            }

            // 2. Fetch Household Member & Household Details
            const { data: memberData, error: memberError } = await supabase
                .from('household_members')
                .select('*, households(*)')
                .eq('user_id', authUser.id)
                .limit(1)
                .maybeSingle();

            if (memberError) {
                console.error('Error fetching household member:', memberError);
            }

            if (memberData) {
                setMember(memberData);
                // @ts-ignore - Supabase types for joins can be tricky, casting for now
                setHousehold(memberData.households as Household);
            } else {
                // User might not be in a household yet
                setMember(null);
                setHousehold(null);
            }

        } catch (error) {
            console.error('Error in HouseholdProvider:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <HouseholdContext.Provider value={{ user, household, member, loading, refreshHousehold: fetchData }}>
            {children}
        </HouseholdContext.Provider>
    );
}
