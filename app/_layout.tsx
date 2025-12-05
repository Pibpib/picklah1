import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Purchases from 'react-native-purchases';
import { useFonts, Roboto_300Light, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '@/services/firebaseConfig';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // RevenueCat initialization
  useEffect(() => {
    const iosApiKey = 'test_rpTQNQDgiGUMBthzMtLmUbBYRXR';
    const androidApiKey = 'test_rpTQNQDgiGUMBthzMtLmUbBYRXR';

    Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE);

    // Initial configure without userID (anonymous)
    Purchases.configure({ apiKey: Platform.OS === 'ios' ? iosApiKey : androidApiKey });

    // Update RevenueCat user when Firebase user changes
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user?.uid) {
        console.log('[RootLayout] Logging in RevenueCat with UID:', user.uid);
        await Purchases.logIn(user.uid);
      } else {
        console.log('[RootLayout] No user, RevenueCat stays anonymous.');
      }
    });

    return () => unsub();
  }, []);

  const [fontsLoaded] = useFonts({
    Roboto_300Light,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
