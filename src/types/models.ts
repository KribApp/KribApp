/**
 * Type definitions for the application data models.
 * These provide type-safe alternatives to using `any` throughout the codebase.
 */

import { Database } from './database.types';

// ============================================================================
// Base Types from Database
// ============================================================================

/** User profile from public.users */
export type UserProfile = Database['public']['Tables']['users']['Row'];

/** Household from public.households */
export type Household = Database['public']['Tables']['households']['Row'];

/** Household member from public.household_members */
export type HouseholdMember = Database['public']['Tables']['household_members']['Row'];

/** Shopping item from public.shopping_items */
export type ShoppingItem = Database['public']['Tables']['shopping_items']['Row'];

/** Chat message from public.chat_messages */
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

/** Chore from public.chores */
export type Chore = Database['public']['Tables']['chores']['Row'];

/** Dining attendance from public.dining_attendance */
export type DiningAttendance = Database['public']['Tables']['dining_attendance']['Row'];

// ============================================================================
// Extended Types (for tables not in database.types.ts)
// ============================================================================

/** Notification from public.notifications */
export interface Notification {
    id: string;
    household_id: string;
    type: 'SHOPPING_ITEM_OUT_OF_STOCK' | 'CHORE_ASSIGNED' | 'SYSTEM' | string;
    title: string;
    message: string;
    content?: string; // Legacy field, prefer 'message'
    related_entity_id: string | null;
    is_resolved: boolean;
    created_at: string;
}

/** Chore template from public.chore_templates */
export interface ChoreTemplate {
    id: string;
    household_id: string;
    title: string;
    created_at: string;
}

// ============================================================================
// Joined Types (for queries with relationships)
// ============================================================================

/** Household member with joined household data */
export type MemberWithHousehold = HouseholdMember & {
    households: Household;
};

/** Chat message with joined user data */
export interface ChatMessageWithUser extends ChatMessage {
    users: Pick<UserProfile, 'id' | 'username' | 'email' | 'profile_picture_url'> | null;
}

/** Chore with joined user data */
export interface ChoreWithAssignee extends Chore {
    users: Pick<UserProfile, 'id' | 'username' | 'email'> | null;
}

/** Household member with joined user data */
export interface HouseholdMemberWithUser extends HouseholdMember {
    users: Pick<UserProfile, 'id' | 'username' | 'email' | 'profile_picture_url'>;
}

// ============================================================================
// Role Types
// ============================================================================

export type MemberRole = 'ADMIN' | 'MEMBER' | 'FISCUS' | 'CORVEE_PLANNER';

// ============================================================================
// Status Types
// ============================================================================

export type ChoreStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';
export type DiningStatus = 'EATING' | 'NOT_EATING' | 'PENDING';
export type MessageType = 'TEXT' | 'SYSTEM_ALERT';

// ============================================================================
// New Feature Types
// ============================================================================

export interface ActivityLog {
    id: string;
    household_id: string;
    user_id: string | null;
    type: string;
    content: string;
    metadata: any;
    created_at: string;
}

export interface ActivityLogWithUser extends ActivityLog {
    users: Pick<UserProfile, 'username' | 'profile_picture_url'> | null;
}

export interface CalendarEvent {
    id: string;
    household_id: string;
    created_by: string | null;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    is_all_day: boolean;
    location: string | null;
    color: string;
    created_at: string;
}

export interface TurfLog {
    id: string;
    ticket_id: string;
    user_id: string | null;
    household_id: string;
    amount_change: number;
    created_at: string;
}

export interface MessageReaction {
    id: string;
    message_id: string;
    user_id: string;
    reaction: string;
    created_at: string;
}
