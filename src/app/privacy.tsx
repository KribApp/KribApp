import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { KribTheme } from '../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

export default function PrivacyScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <X
                        size={24}
                        color={KribTheme.colors.text.primary}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.lastUpdated}>Last Updated: December 15, 2025</Text>

                <Section title="1. Introduction">
                    Welcome to Krib ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our mobile application (the "App").
                </Section>

                <Section title="2. Information We Collect">
                    We collect the minimum amount of information necessary to provide our services:
                    {'\n\n'}
                    • Account Information: When you create an account, we collect your email address and a profile name.
                    {'\n'}
                    • Household Data: We store the data you input regarding your household tasks, expenses, and shopping lists to sync this information with your household members.
                    {'\n'}
                    • Usage Data: We may collect anonymous usage statistics to improve the App's performance.
                </Section>

                <Section title="3. How We Use Your Information">
                    We use your information to:
                    {'\n\n'}
                    • Provide, maintain, and improve the App.
                    {'\n'}
                    • Facilitate collaboration between household members.
                    {'\n'}
                    • Respond to your comments and questions.
                </Section>

                <Section title="4. Data Storage and Security">
                    Your data is securely stored using Supabase. We implement reasonable security measures to protect your information. However, no security system is impenetrable, and we cannot guarantee the security of our systems 100%.
                </Section>

                <Section title="5. Sharing of Information">
                    We do not share your personal information with third parties for marketing purposes. We may share information as required by law or to protect our rights.
                </Section>

                <Section title="6. Your Choices">
                    You may update or correct your account information at any time within the App settings. You may also request the deletion of your account by contacting us or using the delete account feature in the app.
                </Section>

                <Section title="7. Contact Us">
                    If you have any questions about this Privacy Policy, please contact us at: info@kribapp.com
                </Section>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2025 Krib App</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionText}>{children}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: KribTheme.colors.text.primary,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    lastUpdated: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#999',
    },
});
