import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Image, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, LogOut, User, Save, Calendar, Link as LinkIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KribTheme } from '../../theme/theme';
import { supabase } from '../../services/supabase';
import { useEffect, useState, useRef } from 'react';

export default function UserSettings() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [birthdate, setBirthdate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const photoRef = useRef<TextInput>(null);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    async function fetchUserProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            setUserEmail(user.email || '');

            const { data: profile } = await supabase
                .from('users')
                .select('username, profile_picture_url, birthdate')
                .eq('id', user.id)
                .single();

            if (profile) {
                setUsername(profile.username || '');
                setProfilePictureUrl(profile.profile_picture_url || '');
                if (profile.birthdate) setBirthdate(new Date(profile.birthdate));
            }
        }
    }

    async function handleSave() {
        if (!userId) return;
        setSaving(true);

        const { error } = await supabase
            .from('users')
            .update({
                username,
                profile_picture_url: profilePictureUrl || null,
                birthdate: birthdate.toISOString().split('T')[0],
            })
            .eq('id', userId);

        setSaving(false);

        if (error) {
            Alert.alert('Error', 'Kon profiel niet opslaan.');
        } else {
            Alert.alert('Succes', 'Profiel bijgewerkt!');
        }
    }

    async function handleLogout() {
        Alert.alert(
            'Uitloggen',
            'Weet je zeker dat je wilt uitloggen?',
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Uitloggen',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/(auth)/login');
                    }
                }
            ]
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Instellingen</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            {profilePictureUrl ? (
                                <Image source={{ uri: profilePictureUrl }} style={styles.avatarImage} />
                            ) : (
                                <User size={40} color={KribTheme.colors.primary} />
                            )}
                        </View>
                        <Text style={styles.email}>{userEmail}</Text>
                    </View>

                    {/* Edit Profile Form */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profiel Bewerken</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Gebruikersnaam</Text>
                            <View style={styles.inputWrapper}>
                                <User size={20} color="#FFFFFF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Gebruikersnaam"
                                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                    returnKeyType="next"
                                    onSubmitEditing={() => photoRef.current?.focus()}
                                    blurOnSubmit={false}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Profiel Foto URL</Text>
                            <View style={styles.inputWrapper}>
                                <LinkIcon size={20} color="#FFFFFF" style={styles.inputIcon} />
                                <TextInput
                                    ref={photoRef}
                                    style={styles.input}
                                    value={profilePictureUrl}
                                    onChangeText={setProfilePictureUrl}
                                    placeholder="https://example.com/foto.jpg"
                                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                    onSubmitEditing={handleSave}
                                    blurOnSubmit={false}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Geboortedatum</Text>
                            <View style={styles.inputWrapper}>
                                <Calendar size={20} color="#FFFFFF" style={styles.inputIcon} />
                                {Platform.OS === 'android' && (
                                    <TouchableOpacity
                                        style={[styles.input, { justifyContent: 'center' }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={{ color: '#FFFFFF' }}>
                                            {birthdate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {Platform.OS === 'ios' && (
                                    <DateTimePicker
                                        value={birthdate}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            if (selectedDate) {
                                                setBirthdate(selectedDate);
                                            }
                                        }}
                                        style={{ alignSelf: 'flex-start', marginLeft: 10 }}
                                        themeVariant="dark"
                                    />
                                )}
                                {showDatePicker && Platform.OS === 'android' && (
                                    <DateTimePicker
                                        value={birthdate}
                                        mode="date"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowDatePicker(false);
                                            if (selectedDate) {
                                                setBirthdate(selectedDate);
                                            }
                                        }}
                                    />
                                )}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator color={KribTheme.colors.primary} />
                            ) : (
                                <>
                                    <Save size={20} color={KribTheme.colors.primary} />
                                    <Text style={styles.saveButtonText}>Opslaan</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Account Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account</Text>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <LogOut size={20} color={KribTheme.colors.error} />
                            <Text style={styles.logoutText}>Uitloggen</Text>
                        </TouchableOpacity>
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
    backButton: {
        padding: 4,
    },
    content: {
        padding: 16,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
        padding: 24,
        backgroundColor: KribTheme.colors.surface,
        borderRadius: KribTheme.borderRadius.l,
        ...KribTheme.shadows.card,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: KribTheme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    email: {
        fontSize: 16,
        color: KribTheme.colors.text.primary,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.m,
        ...KribTheme.shadows.card,
    },
    logoutText: {
        marginLeft: 12,
        fontSize: 16,
        color: KribTheme.colors.error,
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 6,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#FFFFFF',
    },
    saveButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        marginTop: 8,
        gap: 8,
        ...KribTheme.shadows.card,
    },
    saveButtonText: {
        color: KribTheme.colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
