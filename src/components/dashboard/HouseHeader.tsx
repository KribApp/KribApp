import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Menu } from 'lucide-react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { KribTheme } from '../../theme/theme';

interface HouseHeaderProps {
    photoUrl: string | null;
    householdName: string;
}

export function HouseHeader({ photoUrl, householdName }: HouseHeaderProps) {
    const navigation = useNavigation();

    return (
        <View style={styles.photoContainer}>
            {photoUrl ? (
                <Image
                    source={photoUrl}
                    style={styles.housePhoto}
                    contentFit="cover"
                    transition={1000}
                />
            ) : (
                <View style={styles.placeholderPhoto}>
                    <Text style={styles.placeholderText}>🏠</Text>
                </View>
            )}
            <LinearGradient
                colors={['transparent', 'rgba(22, 24, 29, 0.8)']}
                style={styles.photoOverlay}
            />

            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
                    <Menu size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitleOverlay}>{householdName}</Text>
                <View style={{ width: 28 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    photoContainer: {
        height: '35%',
        width: '100%',
        position: 'relative',
    },
    housePhoto: {
        width: '100%',
        height: '100%',
    },
    placeholderPhoto: {
        width: '100%',
        height: '100%',
        backgroundColor: KribTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 64,
    },
    photoOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    headerOverlay: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    headerTitleOverlay: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});
