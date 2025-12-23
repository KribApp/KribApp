import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { StatusBar } from 'expo-status-bar';
import { KribTheme } from '../../theme/theme';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Ref for password input to focus it after email
    const passwordInputRef = useRef<TextInput>(null);

    async function signInWithEmail() {
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    Alert.alert(
                        'Email niet bevestigd',
                        'Je emailadres is nog niet bevestigd. Check je inbox (en spam) voor de activatielink.'
                    );
                } else if (error.message.includes('Invalid login credentials')) {
                    Alert.alert('Fout', 'Ongeldig emailadres of wachtwoord.');
                } else {
                    Alert.alert('Error', error.message);
                }
                setLoading(false);
                return;
            }

            // Get the authenticated user with proper error handling
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

            if (authError || !authUser) {
                Alert.alert('Error', 'Kon gebruiker niet ophalen. Probeer opnieuw in te loggen.');
                setLoading(false);
                return;
            }

            // Check if profile exists before considering login successful
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('id')
                .eq('id', authUser.id)
                .maybeSingle();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
            }

            if (!profile) {
                await supabase.auth.signOut();
                Alert.alert('Account Error', 'Je profiel is niet gevonden. Registreer opnieuw.');
                setLoading(false);
                return;
            }

            // Success! Profile exists and session is active.
            router.replace('/');
            setLoading(false);
        } catch (err) {
            console.error('Login error:', err);
            Alert.alert('Error', 'Er is iets misgegaan. Probeer het opnieuw.');
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <StatusBar style="light" />
                    <View style={styles.header}>
                        <Image
                            source={require('../../../assets/krib-logo-v3.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Welkom terug!</Text>
                        <Text style={styles.subtitle}>Log in om verder te gaan.</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                onChangeText={setEmail}
                                value={email}
                                placeholder="jouw@email.nl"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                returnKeyType="next"
                                onSubmitEditing={() => passwordInputRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Wachtwoord</Text>
                            <TextInput
                                ref={passwordInputRef}
                                style={styles.input}
                                onChangeText={setPassword}
                                value={password}
                                placeholder="********"
                                placeholderTextColor={KribTheme.colors.text.secondary}
                                secureTextEntry={true}
                                autoCapitalize="none"
                                returnKeyType="done"
                                onSubmitEditing={signInWithEmail}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={signInWithEmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={KribTheme.colors.primary} />
                            ) : (
                                <Text style={styles.buttonText}>Inloggen</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Nog geen account? </Text>
                            <Link href="/(auth)/register" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.link}>Registreer hier</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: KribTheme.colors.background,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    logo: {
        width: 250,
        height: 133,
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: KribTheme.colors.text.inverse,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: KribTheme.colors.text.inverse,
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
        color: KribTheme.colors.text.inverse,
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
    button: {
        backgroundColor: KribTheme.colors.surface,
        padding: 16,
        borderRadius: KribTheme.borderRadius.m,
        alignItems: 'center',
        marginTop: 8,
        ...KribTheme.shadows.card,
    },
    buttonText: {
        color: KribTheme.colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
    footerText: {
        color: KribTheme.colors.text.inverse,
        fontSize: 14,
    },
    link: {
        color: KribTheme.colors.text.inverse,
        fontSize: 14,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});
