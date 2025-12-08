export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    username: string | null
                    email: string | null
                    profile_picture_url: string | null
                    birthdate: string | null
                    phone_number: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    username?: string | null
                    email?: string | null
                    profile_picture_url?: string | null
                    birthdate?: string | null
                    phone_number?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    username?: string | null
                    email?: string | null
                    profile_picture_url?: string | null
                    birthdate?: string | null
                    phone_number?: string | null
                    created_at?: string
                }
            }
            households: {
                Row: {
                    id: string
                    name: string
                    admin_user_id: string
                    invite_code: string
                    config_deadline_time: string | null
                    config_no_response_action: 'EAT' | 'NO_EAT' | null
                    photo_url: string | null
                    timezone: string | null
                    created_at: string
                    street: string | null
                    house_number: string | null
                    postal_code: string | null
                    city: string | null
                    province: string | null
                    country: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    admin_user_id: string
                    invite_code: string
                    config_deadline_time?: string | null
                    config_no_response_action?: 'EAT' | 'NO_EAT' | null
                    photo_url?: string | null
                    timezone?: string | null
                    created_at?: string
                    street?: string | null
                    house_number?: string | null
                    postal_code?: string | null
                    city?: string | null
                    province?: string | null
                    country?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    admin_user_id?: string
                    invite_code?: string
                    config_deadline_time?: string | null
                    config_no_response_action?: 'EAT' | 'NO_EAT' | null
                    photo_url?: string | null
                    timezone?: string | null
                    created_at?: string
                    street?: string | null
                    house_number?: string | null
                    postal_code?: string | null
                    city?: string | null
                    province?: string | null
                    country?: string | null
                }
            }
            household_members: {
                Row: {
                    id: string
                    household_id: string
                    user_id: string
                    role: 'ADMIN' | 'MEMBER' | 'FISCUS' | 'CORVEE_PLANNER' | null
                    karma_points: number | null
                    joined_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    user_id: string
                    role?: 'ADMIN' | 'MEMBER' | 'FISCUS' | 'CORVEE_PLANNER' | null
                    karma_points?: number | null
                    joined_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    user_id?: string
                    role?: 'ADMIN' | 'MEMBER' | 'FISCUS' | 'CORVEE_PLANNER' | null
                    karma_points?: number | null
                    joined_at?: string
                }
            }
            chat_messages: {
                Row: {
                    id: string
                    household_id: string
                    user_id: string | null
                    content: string
                    message_type: 'TEXT' | 'SYSTEM_ALERT' | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    user_id?: string | null
                    content: string
                    message_type?: 'TEXT' | 'SYSTEM_ALERT' | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    user_id?: string | null
                    content?: string
                    message_type?: 'TEXT' | 'SYSTEM_ALERT' | null
                    created_at?: string
                }
            }
            shopping_items: {
                Row: {
                    id: string
                    household_id: string
                    name: string
                    is_checked: boolean | null
                    is_pinned: boolean | null
                    added_by_user_id: string | null
                    created_at: string
                    position: number
                }
                Insert: {
                    id?: string
                    household_id: string
                    name: string
                    is_checked?: boolean | null
                    is_pinned?: boolean | null
                    added_by_user_id?: string | null
                    created_at?: string
                    position?: number
                }
                Update: {
                    id?: string
                    household_id?: string
                    name?: string
                    is_checked?: boolean | null
                    is_pinned?: boolean | null
                    added_by_user_id?: string | null
                    created_at?: string
                    position?: number
                }
            }
            hall_of_fame: {
                Row: {
                    id: string
                    household_id: string
                    name: string
                    photo_url: string | null
                    primary_color: string | null
                    secondary_color: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    name: string
                    photo_url?: string | null
                    primary_color?: string | null
                    secondary_color?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    name?: string
                    photo_url?: string | null
                    primary_color?: string | null
                    secondary_color?: string | null
                    created_at?: string
                }
            }
            dining_attendance: {
                Row: {
                    id: string
                    household_id: string
                    user_id: string
                    date: string
                    status: 'EATING' | 'NOT_EATING' | 'PENDING' | null
                    updated_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    user_id: string
                    date: string
                    status?: 'EATING' | 'NOT_EATING' | 'PENDING' | null
                    updated_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    user_id?: string
                    date?: string
                    status?: 'EATING' | 'NOT_EATING' | 'PENDING' | null
                    updated_at?: string
                }
            }
            chores: {
                Row: {
                    id: string
                    household_id: string
                    title: string
                    assigned_to_user_id: string | null
                    due_date: string | null
                    status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | null
                    points: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    title: string
                    assigned_to_user_id?: string | null
                    due_date?: string | null
                    status?: 'PENDING' | 'COMPLETED' | 'OVERDUE' | null
                    points?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    title?: string
                    assigned_to_user_id?: string | null
                    due_date?: string | null
                    status?: 'PENDING' | 'COMPLETED' | 'OVERDUE' | null
                    points?: number | null
                    created_at?: string
                }
            }
            expenses: {
                Row: {
                    id: string
                    household_id: string
                    payer_user_id: string | null
                    amount: number
                    description: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    payer_user_id?: string | null
                    amount: number
                    description: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    payer_user_id?: string | null
                    amount?: number
                    description?: string
                    created_at?: string
                }
            }
            expense_shares: {
                Row: {
                    id: string
                    expense_id: string
                    user_id: string
                    owed_amount: number
                }
                Insert: {
                    id?: string
                    expense_id: string
                    user_id: string
                    owed_amount: number
                }
                Update: {
                    id?: string
                    expense_id?: string
                    user_id?: string
                    owed_amount?: number
                }
            }
            household_info: {
                Row: {
                    id: string
                    household_id: string
                    title: string
                    content: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    title: string
                    content?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    title?: string
                    content?: string | null
                    created_at?: string
                }
            }
            turf_counters: {
                Row: {
                    id: string
                    household_id: string
                    user_id: string
                    item_name: string
                    count: number | null
                    updated_at: string
                }
                Insert: {
                    id?: string
                    household_id: string
                    user_id: string
                    item_name: string
                    count?: number | null
                    updated_at?: string
                }
                Update: {
                    id?: string
                    household_id?: string
                    user_id?: string
                    item_name?: string
                    count?: number | null
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
