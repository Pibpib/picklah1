import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Purchases from 'react-native-purchases';
import { useFonts, Roboto_300Light, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { onAuthStateChanged } from 'firebase/auth';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // RevenueCat initialization
  useEffect(() => {
    const iosApiKey = 'test_rpTQNQDgiGUMBthzMtLmUbBYRXR';
    const androidApiKey = 'test_rpTQNQDgiGUMBthzMtLmUbBYRXR';

    Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        // Configure RevenueCat per logged-in user
        await Purchases.configure({
          apiKey: Platform.OS === 'ios' ? iosApiKey : androidApiKey,
          appUserID: user.uid,
        });

        console.log('[RevenueCat] configured for UID:', user.uid);
      } catch (e) {
        console.error('[RevenueCat] configuration failed:', e);
      }
    });

    return () => unsubscribe();
  }, []);
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
