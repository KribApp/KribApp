import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Platform, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { KribTheme } from '../../theme/theme';
import { Users, ShoppingCart, ListTodo, MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 768;

export default function LandingPage() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header / Nav */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/krib-logo-v3.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.logoText}>Krib</Text>
                    </View>
                    <View style={styles.authButtons}>
                        {/* Auth buttons removed for landing page */}
                    </View>
                </View>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroContent}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>New: Social Command Center 🚀</Text>
                        </View>
                        <Text style={styles.heroTitle}>
                            Your Household's{'\n'}
                            <Text style={{ color: KribTheme.colors.primary }}>Social Command Center</Text>
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            Manage chores, groceries, finances, and communication in one beautiful, shared space.
                            Finally, a household app that doesn't feel like work.
                        </Text>

                        <View style={styles.ctaContainer}>
                            {/* CTA buttons removed */}
                            <View style={styles.primaryCta}>
                                <Text style={styles.primaryCtaText}>Download in the App Store</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Features Grid */}
                <View style={styles.featuresSection}>
                    <Text style={styles.sectionTitle}>Everything you need to run your Krib.</Text>
                    <View style={styles.featuresGrid}>
                        <FeatureCard
                            icon={ListTodo}
                            title="Smart Chores"
                            desc="Assign tasks, track progress, and keep the house clean without the nagging."
                        />
                        <FeatureCard
                            icon={ShoppingCart}
                            title="Shared Groceries"
                            desc="Real-time shared lists. Never forget the milk again. Sort by aisle automatically."
                        />
                        <FeatureCard
                            icon={Users}
                            title="Finance Splitting"
                            desc="Track shared expenses and settle up easily. No more awkward money talks."
                        />
                        <FeatureCard
                            icon={MessageCircle}
                            title="House Chat"
                            desc="Dedicated space for house updates, announcements, and banter."
                        />
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2025 Krib App. All rights reserved.</Text>
                    <View style={styles.footerLinks}>
                        <Pressable onPress={() => router.push('/privacy')}>
                            <Text style={styles.footerLink}>Privacy</Text>
                        </Pressable>
                        {/* <Text style={styles.footerLink}>Terms</Text> */}
                        <Pressable onPress={() => router.push('/support')}>
                            <Text style={styles.footerLink}>Contact</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
                <Icon size={24} color={KribTheme.colors.primary} />
            </View>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{desc}</Text>
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
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logo: {
        width: 60,
        height: 32,
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        fontFamily: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined,
    },
    authButtons: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    loginButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    loginButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    signupButton: {
        backgroundColor: KribTheme.colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    signupButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    heroSection: {
        paddingVertical: 80,
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: '#FDFDFD',
    },
    heroContent: {
        maxWidth: 800,
        alignItems: 'center',
        width: '100%',
    },
    badge: {
        backgroundColor: KribTheme.colors.primary + '15', // 15% opacity hex
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: KribTheme.colors.primary + '30',
    },
    badgeText: {
        color: KribTheme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    heroTitle: {
        fontSize: isSmallScreen ? 40 : 56,
        fontWeight: '800',
        textAlign: 'center',
        color: '#111',
        marginBottom: 24,
        lineHeight: isSmallScreen ? 48 : 64,
        letterSpacing: -1,
    },
    heroSubtitle: {
        fontSize: 18,
        textAlign: 'center',
        color: '#666',
        marginBottom: 40,
        maxWidth: 600,
        lineHeight: 28,
    },
    ctaContainer: {
        flexDirection: isSmallScreen ? 'column' : 'row',
        gap: 16,
        width: isSmallScreen ? '100%' : 'auto',
    },
    primaryCta: {
        backgroundColor: KribTheme.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
        shadowColor: KribTheme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryCtaText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryCta: {
        backgroundColor: '#FFF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryCtaText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
    },
    featuresSection: {
        paddingVertical: 80,
        paddingHorizontal: 24,
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 48,
        textAlign: 'center',
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
        justifyContent: 'center',
        maxWidth: 1200,
    },
    featureCard: {
        backgroundColor: '#FFF',
        padding: 32,
        borderRadius: 16,
        width: isSmallScreen ? '100%' : 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: KribTheme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    featureTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    featureDesc: {
        fontSize: 15,
        color: '#666',
        lineHeight: 24,
    },
    footer: {
        paddingVertical: 40,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        flexDirection: isSmallScreen ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24,
    },
    footerText: {
        color: '#999',
        fontSize: 14,
    },
    footerLinks: {
        flexDirection: 'row',
        gap: 24,
    },
    footerLink: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
});
