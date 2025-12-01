
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Save, User, Shield, Edit2, Settings, MoreVertical, Trash2, Crown, DollarSign, Calendar, MapPin, Menu } from 'lucide-react-native';
import { ActionSheetIOS } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { KribTheme } from '../../theme/theme';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

export default function HouseInfo() {
    const router = useRouter();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [address, setAddress] = useState<string | null>(null);

    // Info Section
    const [infoText, setInfoText] = useState('');
    const [infoId, setInfoId] = useState<string | null>(null);
    const [savingInfo, setSavingInfo] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Members Section
    const [members, setMembers] = useState<any[]>([]);

    useEffect(() => {
        fetchHouseholdAndUser();
    }, []);

    useEffect(() => {
        if (householdId) {
            fetchInfo();
            fetchMembers();
        }
    }, [householdId]);

    async function fetchHouseholdAndUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: members, error } = await supabase
            .from('household_members')
            .select('household_id, households(address)')
            .eq('user_id', user.id)
            .limit(1);

        if (members && members.length > 0) {
            setHouseholdId(members[0].household_id);
            // @ts-ignore
            setAddress(members[0].households?.address);
        }
    }

    async function fetchInfo() {
        if (!householdId) return;
        const { data } = await supabase
            .from('household_info')
            .select('*')
            .eq('household_id', householdId)
            .eq('title', 'General Info')
            .single();

        if (data) {
            setInfoText(data.content || '');
            setInfoId(data.id);
        }
    }

    async function handleInfoButton() {
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        // Saving logic
        if (!householdId) return;
        setSavingInfo(true);

        const updates = {
            household_id: householdId,
            title: 'General Info',
            content: infoText,
        };

        let error;

        if (infoId) {
            const { error: updateError } = await supabase
                .from('household_info')
                .update(updates)
                .eq('id', infoId);
            error = updateError;
        } else {
            const { data, error: insertError } = await supabase
                .from('household_info')
                .insert([updates])
                .select()
                .single();

            if (data) setInfoId(data.id);
            error = insertError;
        }

        setSavingInfo(false);

        if (error) {
            Alert.alert('Error', 'Kon info niet opslaan.');
        } else {
            setIsEditing(false);
            Alert.alert('Succes', 'Info opgeslagen!');
        }
    }

    async function fetchMembers() {
        if (!householdId) return;
        const { data } = await supabase
            .from('household_members')
            .select('*, users(username, email)')
            .eq('household_id', householdId);

        if (data) {
            setMembers(data);
            setLoading(false); // Set loading to false after fetching members, as counters are removed
        }
    }

    function getRoleIcon(role: string) {
        switch (role) {
            case 'ADMIN': return <Crown size={12} color="#FFFFFF" style={{ marginRight: 4 }} />;
            case 'FISCUS': return <DollarSign size={12} color="#FFFFFF" style={{ marginRight: 4 }} />;
            case 'CORVEE_PLANNER': return <Calendar size={12} color="#FFFFFF" style={{ marginRight: 4 }} />;
            default: return null;
        }
    }

    function getRoleStyle(role: string) {
        switch (role) {
            case 'ADMIN': return styles.roleAdmin;
            case 'FISCUS': return styles.roleFiscus;
            case 'CORVEE_PLANNER': return styles.roleCorvee;
            default: return styles.roleMember;
        }
    }

    function getRoleTextStyle(role: string) {
        switch (role) {
            case 'MEMBER': return styles.roleTextMember;
            default: return styles.roleTextAdmin;
        }
    }

    function handleMemberPress(member: any) {
        // Only admins can manage roles, but not themselves
        const currentUserMember = members.find(m => m.user_id === userId);
        if (currentUserMember?.role !== 'ADMIN' || member.user_id === userId) return;

        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: ['Annuleren', 'Maak Beheerder', 'Maak Fiscus', 'Maak Corvee Planner', 'Maak Bewoner', 'Verwijder uit huis'],
                destructiveButtonIndex: 5,
                cancelButtonIndex: 0,
                title: `Beheer ${member.users?.username}`,
            },
            async (buttonIndex) => {
                if (buttonIndex === 0) return;

                if (buttonIndex === 5) {
                    // Kick member
                    Alert.alert(
                        'Weet je het zeker?',
                        `${member.users?.username} wordt uit het huis verwijderd.`,
                        [
                            { text: 'Annuleren', style: 'cancel' },
                            {
                                text: 'Verwijderen',
                                style: 'destructive',
                                onPress: () => kickMember(member.id)
                            }
                        ]
                    );
                } else {
                    // Change role
                    let newRole = 'MEMBER';
                    if (buttonIndex === 1) newRole = 'ADMIN';
                    if (buttonIndex === 2) newRole = 'FISCUS';
                    if (buttonIndex === 3) newRole = 'CORVEE_PLANNER';

                    updateRole(member.id, newRole);
                }
            }
        );
    }

    async function updateRole(memberId: string, newRole: string) {
        // Optimistic update
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));

        const { error } = await supabase
            .from('household_members')
            .update({ role: newRole } as any)
            .eq('id', memberId);

        if (error) {
            Alert.alert('Error', 'Kon rol niet aanpassen.');
            fetchMembers(); // Revert
        }
    }

    async function kickMember(memberId: string) {
        // Optimistic update
        setMembers(prev => prev.filter(m => m.id !== memberId));

        const { error } = await supabase
            .from('household_members')
            .delete()
            .eq('id', memberId);

        if (error) {
            Alert.alert('Error', 'Kon lid niet verwijderen.');
            fetchMembers(); // Revert
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}>
                    <Menu size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Huis Info</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/house-settings')}>
                    <Settings size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={100}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Address Section */}
                    {address && (
                        <View style={styles.addressCard}>
                            <MapPin size={24} color={KribTheme.colors.text.secondary} />
                            <Text style={styles.addressText}>
                                {address || 'Geen adres ingesteld'}
                            </Text>
                        </View>
                    )}

                    {/* Belangrijke Info Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Text style={styles.sectionTitle}>Belangrijke Info</Text>
                            </View>
                            <TouchableOpacity onPress={handleInfoButton} disabled={savingInfo} style={styles.saveButton}>
                                {savingInfo ? (
                                    <ActivityIndicator size="small" color={KribTheme.colors.text.inverse} />
                                ) : isEditing ? (
                                    <Save size={20} color={KribTheme.colors.text.inverse} />
                                ) : (
                                    <Edit2 size={20} color={KribTheme.colors.text.inverse} />
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={styles.infoCard}>
                            <TextInput
                                style={styles.infoInput}
                                multiline
                                value={infoText}
                                onChangeText={setInfoText}
                                placeholder={isEditing ? "Schrijf hier belangrijke info (wifi codes, regels, etc)..." : "Nog geen info toegevoegd."}
                                textAlignVertical="top"
                                editable={isEditing}
                            />
                        </View>
                    </View>

                    {/* Leden Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionTitleContainer}>
                            <Text style={styles.sectionTitle}>Leden</Text>
                        </View>
                        <View style={styles.membersList}>
                            {members.map(member => (
                                <TouchableOpacity key={member.id} style={styles.memberCard} onPress={() => handleMemberPress(member)}>
                                    <View style={styles.memberInfo}>
                                        <View style={styles.avatarPlaceholder}>
                                            <User size={20} color="#6B7280" />
                                        </View>
                                        <View>
                                            <Text style={styles.memberName}>{member.users?.username || 'Onbekend'}</Text>
                                            <Text style={styles.memberEmail}>{member.users?.email}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.roleBadge, getRoleStyle(member.role)]}>
                                        {getRoleIcon(member.role)}
                                        <Text style={[styles.roleText, getRoleTextStyle(member.role)]}>
                                            {member.role}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.l,
        marginBottom: 24,
        ...KribTheme.shadows.card,
    },
    addressText: {
        marginLeft: 12,
        fontSize: 16,
        color: KribTheme.colors.text.primary,
        flex: 1,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitleContainer: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    saveButton: {
        backgroundColor: KribTheme.colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoCard: {
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.l,
        minHeight: 120,
        marginBottom: 24,
        ...KribTheme.shadows.card,
    },
    infoInput: {
        fontSize: 16,
        color: KribTheme.colors.text.primary,
        minHeight: 120,
    },
    membersList: {
        gap: 8,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.l,
        marginBottom: 12,
        ...KribTheme.shadows.card,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: KribTheme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: KribTheme.colors.text.primary,
    },
    memberEmail: {
        fontSize: 12,
        color: KribTheme.colors.text.secondary,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleAdmin: {
        backgroundColor: '#2563EB',
    },
    roleMember: {
        backgroundColor: '#E5E7EB',
    },
    roleFiscus: {
        backgroundColor: '#10B981', // Green
    },
    roleCorvee: {
        backgroundColor: '#F59E0B', // Amber
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    roleTextAdmin: {
        color: '#FFFFFF',
    },
    roleTextMember: {
        color: '#374151',
    },
});
