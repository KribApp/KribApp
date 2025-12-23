import { supabase } from './supabase';
import { DiningStatus } from '../types/models';

export const DiningService = {
    /**
     * Applies "Default Eating" logic for the current day.
     * Sets status to 'EATING' for all members who have no record or are 'PENDING'.
     */
    async applyDefaultEatingForToday(householdId: string): Promise<number> {
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Get all household members
            const { data: members, error: membersError } = await supabase
                .from('household_members')
                .select('user_id')
                .eq('household_id', householdId);

            if (membersError) throw membersError;
            if (!members || members.length === 0) return 0;

            // 2. Get existing attendance for today
            const { data: attendance, error: attendanceError } = await supabase
                .from('dining_attendance')
                .select('user_id, status')
                .eq('household_id', householdId)
                .eq('date', today);

            if (attendanceError) throw attendanceError;

            // Map existing status for quick lookup
            const attendanceMap = new Map<string, string>();
            attendance?.forEach(record => {
                attendanceMap.set(record.user_id, record.status);
            });

            // 3. Identify who needs updating
            const updates = [];
            for (const member of members) {
                const currentStatus = attendanceMap.get(member.user_id);

                // If no record exists OR status is PENDING, set to EATING
                if (!currentStatus || currentStatus === 'PENDING') {
                    updates.push({
                        household_id: householdId,
                        user_id: member.user_id,
                        date: today,
                        status: 'EATING' as DiningStatus,
                        // If it's an update, we might need the ID, but upsert on (user_id, household_id, date) should work 
                        // IF there is a unique constraint on those columns.
                        // Assuming standard schema typically has unique(household_id, user_id, date)
                    });
                }
            }

            if (updates.length === 0) return 0;

            // 4. Perform Upsert
            const { error: upsertError } = await supabase
                .from('dining_attendance')
                .upsert(updates, { onConflict: 'household_id,user_id,date' });

            if (upsertError) throw upsertError;

            return updates.length;

        } catch (error) {
            console.error('Error in applyDefaultEatingForToday:', error);
            throw error;
        }
    }
};
