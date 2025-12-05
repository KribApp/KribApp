import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { StatusBar } from 'expo-status-bar';
import { KribTheme } from '../../theme/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Eye, EyeOff } from 'lucide-react-native';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [birthdate, setBirthdate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

    async function signUpWithEmail() {
        if (!email || !password || !confirmPassword || !username) {
            Alert.alert('Fout', 'Vul alle verplichte velden in.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Fout', 'Wachtwoorden komen niet overeen.');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(birthdate);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate >= today) {
            Alert.alert('Fout', 'Geboortedatum moet in het verleden liggen.');
            return;
        }

        setLoading(true);

        // 1. Sign up with Supabase Auth
        const { data: { session, user }, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                },
            },
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
            return;
        }

        if (user) {
            // User is logged in immediately (email confirmation disabled)
            Alert.alert('Succes', 'Account aangemaakt! Je bent nu ingelogd.');
            // Redirect will happen automatically via auth state change listener
        }
    }



    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <StatusBar style="light" />
                <View style={styles.header}>
                    <Text style={styles.title}>Maak een account</Text>
                    <Text style={styles.subtitle}>Start met het organiseren van je huis.</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Gebruikersnaam</Text>
                        <TextInput
                            style={styles.input}
                            onChangeText={setUsername}
                            value={username}
                            placeholder="Kies een naam"
                            placeholderTextColor={KribTheme.colors.text.secondary}
                            autoCapitalize="none"
                            returnKeyType="next"
                            onSubmitEditing={() => emailRef.current?.focus()}
                            blurOnSubmit={false}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            ref={emailRef}
                            style={styles.input}
                            onChangeText={setEmail}
                            value={email}
                            placeholder="jouw@email.nl"
                            placeholderTextColor={KribTheme.colors.text.secondary}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            blurOnSubmit={false}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Wachtwoord</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                ref={passwordRef}
                                style={styles.passwordInput}
                                onChangeText={setPassword}
                                value={password}
                                placeholder="Minimaal 6 tekens"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                returnKeyType="next"
                                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                {showPassword ? (
                                    <EyeOff size={20} color={KribTheme.colors.text.secondary} />
                                ) : (
                                    <Eye size={20} color={KribTheme.colors.text.secondary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Wachtwoord bevestigen</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                ref={confirmPasswordRef}
                                style={styles.passwordInput}
                                onChangeText={setConfirmPassword}
                                value={confirmPassword}
                                placeholder="Herhaal wachtwoord"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                returnKeyType="done"
                                onSubmitEditing={signUpWithEmail}
                                blurOnSubmit={false}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                {showConfirmPassword ? (
                                    <EyeOff size={20} color={KribTheme.colors.text.secondary} />
                                ) : (
                                    <Eye size={20} color={KribTheme.colors.text.secondary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Geboortedatum</Text>
                        {Platform.OS === 'android' && (
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: KribTheme.colors.text.primary }}>
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
                                style={{ alignSelf: 'flex-start' }}
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

                    <TouchableOpacity
                        style={styles.button}
                        onPress={signUpWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={KribTheme.colors.text.inverse} />
                        ) : (
                            <Text style={styles.buttonText}>Registreren</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Heb je al een account? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>Log in</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: KribTheme.colors.background, // Indigo
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: KribTheme.colors.text.inverse, // White
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: KribTheme.colors.text.inverse, // White
        opacity: 0.9,
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: KribTheme.colors.text.inverse, // White
    },
    input: {
        backgroundColor: KribTheme.colors.surface,
        borderWidth: 1,
        borderColor: KribTheme.colors.border,
        borderRadius: KribTheme.borderRadius.m,
        padding: 16,
        fontSize: 16,
        color: KribTheme.colors.text.primary,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: KribTheme.colors.surface,
        borderWidth: 1,
        borderColor: KribTheme.colors.border,
        borderRadius: KribTheme.borderRadius.m,
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: KribTheme.colors.text.primary,
    },
    eyeIcon: {
        padding: 16,
    },
    button: {
        backgroundColor: '#FFFFFF', // White button
        padding: 16,
        borderRadius: KribTheme.borderRadius.m,
        alignItems: 'center',
        marginTop: 8,
        ...KribTheme.shadows.card,
    },
    buttonText: {
        color: KribTheme.colors.primary, // Indigo text
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
    footerText: {
        color: KribTheme.colors.text.inverse, // White
        fontSize: 14,
    },
    link: {
        color: KribTheme.colors.text.inverse, // White for better contrast on Indigo
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});
