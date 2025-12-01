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
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            // Session update will trigger redirect in index.tsx or _layout.tsx
            // But we can also manually push if needed, though the auth listener is better.
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
                    <StatusBar style="dark" backgroundColor="#FFFFFF" />
                    <View style={styles.header}>
                        <Image
                            source={require('../../../assets/krib-logo.png')}
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
                                <ActivityIndicator color={KribTheme.colors.text.inverse} />
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
        backgroundColor: '#FFFFFF',
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    logo: {
        width: 250,
        height: 250,
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: KribTheme.colors.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: KribTheme.colors.primary,
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
        color: KribTheme.colors.primary,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: KribTheme.colors.primary,
        borderRadius: KribTheme.borderRadius.m,
        padding: 16,
        fontSize: 16,
        color: KribTheme.colors.primary,
    },
    button: {
        backgroundColor: KribTheme.colors.primary,
        padding: 16,
        borderRadius: KribTheme.borderRadius.m,
        alignItems: 'center',
        marginTop: 8,
        ...KribTheme.shadows.card,
    },
    buttonText: {
        color: KribTheme.colors.text.inverse,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
    footerText: {
        color: KribTheme.colors.primary,
        fontSize: 14,
    },
    link: {
        color: KribTheme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});
