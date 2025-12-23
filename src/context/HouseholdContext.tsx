import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { router } from 'expo-router';
import { UserProfile, Household, HouseholdMember, MemberWithHousehold } from '../types/models';

interface HouseholdContextType {
    user: UserProfile | null;
    household: Household | null;
    member: HouseholdMember | null;
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
    const [member, setMember] = useState<HouseholdMember | null>(null);
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
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

            if (authError) {
                // Ignore "Auth session missing!" error - it just means not logged in
                if (authError.message.includes('Auth session missing') || authError.name === 'AuthSessionMissingError') {
                    // console.log('No auth session found (normal for first launch)');
                    setLoading(false);
                    return;
                }

                // Handle invalid refresh token (expired session) gracefully
                if (authError.message.includes('Refresh Token') || authError.message.includes('refresh_token_not_found')) {
                    console.log('Session expired (invalid refresh token). Redirecting to login...');
                    await supabase.auth.signOut();
                    setLoading(false);
                    router.replace('/(auth)/login');
                    return;
                }

                // Log other unexpected errors
                console.error('Auth error in context:', authError);
            }

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
                // User exists in Auth but not in public.users (e.g. after DB reset or during registration)
                console.warn('User profile not found. Waiting for creation...');
                // Do NOT sign out here. Let the registration/callback flow handle the insertion.
                return;
            } else {
                // Check if birthdate is missing but exists in metadata (e.g. from registration)
                if (!userProfile.birthdate && authUser.user_metadata?.birthdate) {
                    // Sync birthdate to profile
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ birthdate: authUser.user_metadata.birthdate })
                        .eq('id', authUser.id);

                    if (!updateError) {
                        userProfile.birthdate = authUser.user_metadata.birthdate;
                    }
                }

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
                // Cast to our typed interface for joined query
                const typedMember = memberData as unknown as MemberWithHousehold;
                setMember(typedMember);
                setHousehold(typedMember.households);
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
