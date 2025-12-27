import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { KribTheme } from '../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingPage() {
    const windowWidth = Dimensions.get('window').width;
    const isMobileWeb = windowWidth < 768;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/krib-logo-v3.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.authButtons}>
                        <Pressable
                            style={[styles.button, styles.loginButton]}
                            onPress={() => router.push('/(auth)/login')}
                        >
                            <Text style={styles.loginButtonText}>Inloggen</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.button, styles.registerButton]}
                            onPress={() => router.push('/(auth)/register')}
                        >
                            <Text style={styles.registerButtonText}>Registreren</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Hero Section */}
                <View style={[styles.heroSection, isMobileWeb && styles.heroSectionMobile]}>
                    <View style={[styles.heroContent, isMobileWeb && styles.heroContentMobile]}>
                        <Text style={styles.heroTitle}>
                            Je huishouden regelen was nog nooit zo <Text style={{ color: KribTheme.colors.primary }}>makkelijk</Text>.
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            De alles-in-één app voor huisgenoten, gezinnen en koppels. Beheer taken, uitgaven en je agenda op één plek.
                        </Text>
                        <Pressable
                            style={[styles.ctaButton]}
                            onPress={() => router.push('/(auth)/register')}
                            onHoverIn={() => { }} // Web hover support could be added here
                        >
                            <Text style={styles.ctaButtonText}>Start direct gratis</Text>
                        </Pressable>
                    </View>

                    {/* Visual Element / Illustration placeholder */}
                    <View style={[styles.heroVisual, isMobileWeb && styles.heroVisualMobile]}>
                        <View style={styles.mockupContainer}>
                            <View style={styles.mockupCard}>
                                <Text style={styles.mockupTitle}>👋 Welkom thuis!</Text>
                                <View style={styles.mockupRow}>
                                    <View style={[styles.mockupItem, { backgroundColor: '#E0E7FF' }]} />
                                    <View style={[styles.mockupItem, { flex: 2 }]} />
                                </View>
                                <View style={styles.mockupRow}>
                                    <View style={[styles.mockupItem, { flex: 1.5 }]} />
                                    <View style={[styles.mockupItem, { backgroundColor: '#FEE2E2' }]} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Features Section */}
                <View style={styles.featuresSection}>
                    <FeatureCard
                        icon="✨"
                        title="Takenlijst"
                        description="Verdeel taken eerlijk en streep ze af. Geen gedoe meer over wiens beurt het is."
                    />
                    <FeatureCard
                        icon="💰"
                        title="Pot & Uitgaven"
                        description="Houd bij wie wat betaalt en verreken kosten eenvoudig met één druk op de knop."
                    />
                    <FeatureCard
                        icon="📅"
                        title="Agenda"
                        description="Zie in één oogopslag wie wanneer thuis is en of er meegegeten wordt."
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function FeatureCard({ icon, title, description }: { icon: string, title: string, description: string }) {
    return (
        <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 24,
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 100,
        height: 40,
    },
    authButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButton: {
        backgroundColor: 'transparent',
    },
    loginButtonText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: KribTheme.colors.text.primary,
        fontWeight: '600',
    },
    registerButton: {
        backgroundColor: KribTheme.colors.primary,
        shadowColor: KribTheme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    registerButtonText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    heroSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        paddingVertical: 64,
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        gap: 48,
        minHeight: 600,
    },
    heroSectionMobile: {
        flexDirection: 'column',
        paddingVertical: 32,
        gap: 32,
        textAlign: 'center',
        minHeight: 'auto',
    },
    heroContent: {
        flex: 1,
        gap: 24,
    },
    heroContentMobile: {
        alignItems: 'center',
        textAlign: 'center',
    },
    heroTitle: {
        fontSize: 56,
        fontFamily: 'Inter_800ExtraBold',
        color: '#111827',
        lineHeight: 1.1,
        fontWeight: '800',
    },
    heroSubtitle: {
        fontSize: 20,
        fontFamily: 'Inter_400Regular',
        color: '#4B5563',
        lineHeight: 1.5,
        maxWidth: 500,
    },
    ctaButton: {
        backgroundColor: KribTheme.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginTop: 16,
        shadowColor: KribTheme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    ctaButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        fontWeight: '700',
    },
    heroVisual: {
        flex: 1,
        height: 500,
        backgroundColor: '#F3F4F6',
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    heroVisualMobile: {
        width: '100%',
        height: 300,
    },
    mockupContainer: {
        width: '80%',
        height: '80%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 40,
        elevation: 10,
        padding: 24,
        justifyContent: 'center',
    },
    mockupCard: {
        gap: 16,
    },
    mockupTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    mockupRow: {
        flexDirection: 'row',
        gap: 12,
        height: 40,
    },
    mockupItem: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    featuresSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 24,
        paddingHorizontal: 32,
        paddingVertical: 64,
        backgroundColor: '#F9FAFB',
    },
    featureCard: {
        backgroundColor: '#FFFFFF',
        padding: 32,
        borderRadius: 24,
        width: 350,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    featureIcon: {
        fontSize: 40,
    },
    featureTitle: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: '#111827',
        fontWeight: '700',
    },
    featureDescription: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 1.5,
    },
});
