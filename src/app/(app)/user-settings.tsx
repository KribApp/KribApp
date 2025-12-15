import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, LogOut, User, Save, Calendar, Link as LinkIcon, Moon, Sun, Trash2, Mail, Camera, X, Bell } from 'lucide-react-native';
import { KribTheme } from '../../theme/theme';
import { supabase } from '../../services/supabase';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import { useHousehold } from '../../context/HouseholdContext';

export default function UserSettings() {
    const router = useRouter();
    const { refreshHousehold } = useHousehold();
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [birthdate, setBirthdate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // UI State
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false); // Local preference for now

    // Notifications State
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);

    useEffect(() => {
        fetchUserProfile();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('user_theme');
            setIsDarkMode(savedTheme === 'dark');

            const savedPush = await AsyncStorage.getItem('user_push_enabled');
            if (savedPush !== null) setPushEnabled(savedPush === 'true');

            const savedEmail = await AsyncStorage.getItem('user_email_enabled');
            if (savedEmail !== null) setEmailEnabled(savedEmail === 'true');
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const toggleTheme = async (value: boolean) => {
        setIsDarkMode(value);
        try {
            await AsyncStorage.setItem('user_theme', value ? 'dark' : 'light');
            // In a full app, this would trigger a context update
            Alert.alert("Thema gewijzigd", "Je voorkeur is opgeslagen. (Thema ondersteuning is nog in ontwikkeling)");
        } catch (e) {
            console.error('Failed to save theme', e);
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
            // Use userId in path to organize, or just verify unique name
            // 'avatars' bucket must be public or have proper policies
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
                mediaTypes: MediaTypeOptions.Images,
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
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Persoonlijke Instellingen</Text>
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
                        <Text style={styles.sectionHeaderText}>PROFIEL</Text>
                    </View>

                    <View style={styles.card}>
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
                                <User size={40} color={KribTheme.colors.primary} />
                            )}
                            <TouchableOpacity style={styles.changePhotoButton} onPress={handlePickImage} disabled={uploading}>
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Camera size={20} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Gebruikersnaam</Text>
                            <View style={styles.inputWrapper}>
                                <User size={20} color={KribTheme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={handleUsernameChange}
                                    placeholder="Gebruikersnaam"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Geboortedatum</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: '#F3F4F6' }]}>
                                <Calendar size={20} color={KribTheme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: '#6B7280' }]}
                                    value={birthdate.toLocaleDateString()}
                                    editable={false}
                                />
                            </View>
                        </View>


                    </View>

                    {/* SECTION 2: APPEARANCE */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={styles.sectionHeaderText}>UITERLIJK & APP</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconCircle}>
                                    {isDarkMode ? <Moon size={20} color="#5D5FEF" /> : <Sun size={20} color="#5D5FEF" />}
                                </View>
                                <View>
                                    <Text style={styles.settingTitle}>Donkere Modus</Text>
                                    <Text style={styles.settingSubtitle}>Pas het uiterlijk van de app aan</Text>
                                </View>
                            </View>
                            <Switch
                                trackColor={{ false: "#E5E7EB", true: "#818CF8" }}
                                thumbColor={isDarkMode ? "#5D5FEF" : "#f4f3f4"}
                                onValueChange={toggleTheme}
                                value={isDarkMode}
                            />
                        </View>
                    </View>

                    {/* SECTION 3: ACCOUNT */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={styles.sectionHeaderText}>ACCOUNT</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Adres</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: '#F3F4F6' }]}>
                                <Mail size={20} color={KribTheme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: '#6B7280' }]}
                                    value={userEmail}
                                    editable={false}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <LogOut size={20} color="#5D5FEF" />
                            <Text style={styles.logoutText}>Uitloggen</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                            <Trash2 size={20} color="#EF4444" />
                            <Text style={styles.deleteText}>Account Verwijderen</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );


    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Persoonlijke Instellingen</Text>
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
                        <Text style={styles.sectionHeaderText}>PROFIEL</Text>
                    </View>

                    <View style={styles.card}>
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
                                <User size={40} color={KribTheme.colors.primary} />
                            )}
                            <TouchableOpacity style={styles.changePhotoButton} onPress={handlePickImage} disabled={uploading}>
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Camera size={20} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Gebruikersnaam</Text>
                            <View style={styles.inputWrapper}>
                                <User size={20} color={KribTheme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={handleUsernameChange}
                                    placeholder="Gebruikersnaam"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Geboortedatum</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: '#F3F4F6' }]}>
                                <Calendar size={20} color={KribTheme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: '#6B7280' }]}
                                    value={birthdate.toLocaleDateString()}
                                    editable={false}
                                />
                            </View>
                        </View>


                    </View>

                    {/* SECTION 2: APPEARANCE */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={styles.sectionHeaderText}>UITERLIJK & APP</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconCircle}>
                                    {isDarkMode ? <Moon size={20} color="#5D5FEF" /> : <Sun size={20} color="#5D5FEF" />}
                                </View>
                                <View>
                                    <Text style={styles.settingTitle}>Donkere Modus</Text>
                                    <Text style={styles.settingSubtitle}>Pas het uiterlijk van de app aan</Text>
                                </View>
                            </View>
                            <Switch
                                trackColor={{ false: "#E5E7EB", true: "#818CF8" }}
                                thumbColor={isDarkMode ? "#5D5FEF" : "#f4f3f4"}
                                onValueChange={toggleTheme}
                                value={isDarkMode}
                            />
                        </View>
                    </View>

                    {/* SECTION 3: ACCOUNT */}
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={styles.sectionHeaderText}>ACCOUNT</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Adres</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: '#F3F4F6' }]}>
                                <Mail size={20} color={KribTheme.colors.text.secondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: '#6B7280' }]}
                                    value={userEmail}
                                    editable={false}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <LogOut size={20} color="#5D5FEF" />
                            <Text style={styles.logoutText}>Uitloggen</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                            <Trash2 size={20} color="#EF4444" />
                            <Text style={styles.deleteText}>Account Verwijderen</Text>
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
        backgroundColor: KribTheme.colors.background, // Using primary color for background behind cards look
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: KribTheme.colors.primary,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
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
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
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
        position: 'relative', // For absolute positioning of camera button
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
        borderColor: '#FFFFFF',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
        color: '#111827',
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
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
        marginTop: 8,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        color: '#5D5FEF',
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
        color: '#EF4444',
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
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    settingSubtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 52, // Align with text
    },
});
