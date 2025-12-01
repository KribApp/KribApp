import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { HouseholdProvider } from '../context/HouseholdContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <HouseholdProvider>
                <StatusBar style="auto" />
                <Slot />
            </HouseholdProvider>
        </SafeAreaProvider>
    );
}
