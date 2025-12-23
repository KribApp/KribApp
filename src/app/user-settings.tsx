import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, LogOut, User, Calendar, Moon, Sun, Trash2, Mail, Camera, Flag, LifeBuoy, Shield, ChevronRight } from 'lucide-react-native';
import { Linking } from 'react-native';
import { KribTheme } from '../theme/theme';
import { supabase } from '../services/supabase';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import { useHousehold } from '../context/HouseholdContext';
import { useTheme } from '../context/ThemeContext';

export default function UserSettings() {
    const router = useRouter();
    const { refreshHousehold } = useHousehold();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [birthdate, setBirthdate] = useState(new Date());
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // UI State
    const [uploading, setUploading] = useState(false);

    // Notifications State
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);

    useEffect(() => {
        fetchUserProfile();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedPush = await AsyncStorage.getItem('user_push_enabled');
            if (savedPush !== null) setPushEnabled(savedPush === 'true');

            const savedEmail = await AsyncStorage.getItem('user_email_enabled');
            if (savedEmail !== null) setEmailEnabled(savedEmail === 'true');
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const togglePush = async (value: boolean) => {
        setPushEnabled(value);
        await AsyncStorage.setItem('user_push_enabled', String(value));
    };

    const toggleEmail = async (value: boolean) => {
        setEmailEnabled(value);
        await AsyncStorage.setItem('user_email_enabled', String(value));
    };

    const uploadImage = async (uri: string) => {
        try {
            setUploading(true);

            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });
            const arrayBuffer = decode(base64);

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, arrayBuffer, {
                    contentType: `image/${fileExt}`,
                    upsert: true,
                });

            if (uploadError) {
                if (uploadError.message.includes('Bucket not found')) {
                    Alert.alert('Error', 'Storage bucket "avatars" not found. Please create it in Supabase.');
                }
                throw uploadError;
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Fout', 'Kon afbeelding niet uploaden.');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1], // Square for profile
                quality: 0.8,
            });

            if (!result.canceled) {
                const uploadedUrl = await uploadImage(result.assets[0].uri);
                if (uploadedUrl) {
                    setProfilePictureUrl(uploadedUrl);
                    handleAutoSave(username, uploadedUrl, birthdate);
                }
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Fout', 'Kon galerij niet openen.');
        }
    };

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

    async function handleAutoSave(newUsername: string, newProfilePic: string, newBirthdate: Date) {
        if (!userId) return;

        const { error } = await supabase
            .from('users')
            .update({
                username: newUsername,
                profile_picture_url: newProfilePic || null,
                birthdate: `${newBirthdate.getFullYear()}-${String(newBirthdate.getMonth() + 1).padStart(2, '0')}-${String(newBirthdate.getDate()).padStart(2, '0')}`,
            })
            .eq('id', userId);

        if (!error) {
            await refreshHousehold();
        }
    }

    const handleUsernameChange = (text: string) => {
        setUsername(text);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            handleAutoSave(text, profilePictureUrl, birthdate);
        }, 1000);
    };

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

    const handleReportContent = () => {
        Linking.openURL('mailto:info@kribapp.com?subject=Rapporteer Inhoud&body=Beschrijf hier de inhoud die je wilt rapporteren:');
    };

    async function handleDeleteAccount() {
        Alert.alert(
            'Account Verwijderen',
            'WAARSCHUWING: Dit is permanent. Je account en gegevens worden verwijderd.',
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'VERWIJDEREN',
                    style: 'destructive',
                    onPress: async () => {
                        // This usually requires a secure environment function (RPC) or complex client logic with RLS
                        Alert.alert('Nog niet beschikbaar', 'Neem contact op met support om je account te verwijderen.');
                    }
                }
            ]
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.onBackground} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Persoonlijke Instellingen</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                    {/* SECTION 1: PROFILE */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={[styles.sectionHeaderText, { color: theme.colors.onBackground, opacity: 0.7 }]}>PROFIEL</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.avatarContainer}>
                            {profilePictureUrl ? (
                                <Image
                                    key={profilePictureUrl}
                                    source={{ uri: profilePictureUrl }}
                                    style={styles.avatarImage}
                                    contentFit="cover"
                                    transition={200}
                                />
                            ) : (
                                <User size={40} color={theme.colors.primary} />
                            )}
                            <TouchableOpacity style={[styles.changePhotoButton, { borderColor: theme.colors.surface }]} onPress={handlePickImage} disabled={uploading}>
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Camera size={20} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Gebruikersnaam</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                <User size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text.primary }]}
                                    value={username}
                                    onChangeText={handleUsernameChange}
                                    placeholder="Gebruikersnaam"
                                    placeholderTextColor={theme.colors.text.secondary}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Geboortedatum</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                <Calendar size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text.secondary }]}
                                    value={birthdate.toLocaleDateString()}
                                    editable={false}
                                />
                            </View>
                        </View>
                    </View>

                    {/* SECTION 2: APPEARANCE */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={[styles.sectionHeaderText, { color: theme.colors.onBackground, opacity: 0.7 }]}>UITERLIJK & APP</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#312e81' : '#EEF2FF' }]}>
                                    {isDarkMode ? <Moon size={20} color={theme.colors.primary} /> : <Sun size={20} color={theme.colors.primary} />}
                                </View>
                                <View>
                                    <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>Donkere Modus</Text>
                                    <Text style={[styles.settingSubtitle, { color: theme.colors.text.secondary }]}>Pas het uiterlijk van de app aan</Text>
                                </View>
                            </View>
                            <Switch
                                trackColor={{ false: "#E5E7EB", true: theme.colors.primary }}
                                thumbColor={isDarkMode ? theme.colors.surface : "#f4f3f4"}
                                onValueChange={toggleTheme}
                                value={isDarkMode}
                            />
                        </View>
                    </View>

                    {/* SECTION 3: SUPPORT & SAFETY */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={[styles.sectionHeaderText, { color: theme.colors.onBackground, opacity: 0.7 }]}>ONDERSTEUNING & VEILIGHEID</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.colors.surface, padding: 0, overflow: 'hidden' }]}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleReportContent}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                                    <Flag size={20} color={theme.colors.error} />
                                </View>
                                <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>Rapporteer inhoud</Text>
                            </View>
                            <ChevronRight size={20} color={theme.colors.text.secondary} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => router.push('/support')}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                                    <LifeBuoy size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>Help & Support</Text>
                            </View>
                            <ChevronRight size={20} color={theme.colors.text.secondary} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => router.push('/privacy')}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                                    <Shield size={20} color="#10B981" />
                                </View>
                                <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>Privacybeleid</Text>
                            </View>
                            <ChevronRight size={20} color={theme.colors.text.secondary} />
                        </TouchableOpacity>
                    </View>

                    {/* SECTION 4: ACCOUNT */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={[styles.sectionHeaderText, { color: theme.colors.onBackground, opacity: 0.7 }]}>ACCOUNT</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Email Adres</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                <Mail size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text.secondary }]}
                                    value={userEmail}
                                    editable={false}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDarkMode ? '#1e1b4b' : '#EEF2FF', borderColor: theme.colors.primary }]} onPress={handleLogout}>
                            <LogOut size={20} color={theme.colors.primary} />
                            <Text style={[styles.logoutText, { color: theme.colors.primary }]}>Uitloggen</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                            <Trash2 size={20} color={theme.colors.error} />
                            <Text style={[styles.deleteText, { color: theme.colors.error }]}>Account Verwijderen</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 16,
        paddingTop: 8,
    },
    sectionHeaderContainer: {
        marginBottom: 8,
        marginTop: 16,
        paddingHorizontal: 4,
    },
    sectionHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        ...KribTheme.shadows.card,
    },
    avatarContainer: {
        alignSelf: 'center',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    changePhotoButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#5D5FEF',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
    },
    saveButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        backgroundColor: KribTheme.colors.primary,
        marginTop: 8,
        gap: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        marginTop: 12,
        opacity: 0.8,
        gap: 8,
    },
    deleteText: {
        fontSize: 14,
        fontWeight: '500',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    settingSubtitle: {
        fontSize: 12,
    },
    divider: {
        height: 1,
        marginLeft: 56,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
});
