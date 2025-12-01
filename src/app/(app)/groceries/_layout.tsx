import { Stack } from 'expo-router';

export default function GroceriesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="hall-of-fame" />
        </Stack>
    );
}
