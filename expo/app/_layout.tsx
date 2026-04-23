import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { StashProvider } from "@/providers/StashProvider";
import { SubscriptionProvider, useSubscription } from "@/providers/SubscriptionProvider";
import { AdminProvider } from "@/providers/AdminProvider";
import PinLockScreen from "@/components/PinLockScreen";
import TrialLockScreen from "@/components/TrialLockScreen";
import VideoSplashScreen from "@/components/VideoSplashScreen";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function useProtectedRoute(isAuthenticated: boolean, isLoading: boolean) {
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isLoading) {
      console.log('useProtectedRoute: still loading, skipping navigation');
      return;
    }

    if (!navigationState?.key) {
      console.log('useProtectedRoute: navigation not ready yet');
      return;
    }

    const inAuthGroup = segments[0] === 'auth';

    console.log('useProtectedRoute: isAuthenticated=', isAuthenticated, 'inAuthGroup=', inAuthGroup, 'segments=', segments.join('/'));

    if (!isAuthenticated && !inAuthGroup) {
      console.log('useProtectedRoute: not authenticated, redirecting to sign-in');
      hasNavigated.current = true;
      router.replace('/auth/sign-in');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('useProtectedRoute: authenticated but in auth group, redirecting to home');
      hasNavigated.current = true;
      router.replace('/');
    }
  }, [isAuthenticated, segments, isLoading, navigationState?.key]);
}

function AppContent() {
  const { isAuthenticated, isLoading, isLocked, hasPinSet, isNewSignUp, justLoggedIn, isPasswordRecovery } = useAuth();
  const { isLocked: isTrialExpired } = useSubscription();
  const [showVideoSplash, setShowVideoSplash] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const hasHiddenSplashRef = useRef(false);

  useProtectedRoute(isAuthenticated, isLoading);

  useEffect(() => {
    if (isLoading) {
      console.log("AppContent: auth is still loading, keeping splash screen visible");
      return;
    }

    console.log("AppContent: auth finished loading, isAuthenticated=", isAuthenticated);
    setIsAppReady(true);
  }, [isLoading, isAuthenticated]);

  const handleAppLayout = useCallback(() => {
    if (!isAppReady || hasHiddenSplashRef.current) {
      return;
    }

    hasHiddenSplashRef.current = true;
    console.log("AppContent: root layout mounted, hiding splash screen");

    void SplashScreen.hideAsync().catch((error: Error) => {
      console.log("AppContent: failed to hide splash screen", error.message);
      hasHiddenSplashRef.current = false;
    });
  }, [isAppReady]);

  useEffect(() => {
    console.log("AppContent: showing video splash on app launch");
  }, []);

  if (!isAppReady) {
    return <View style={styles.loadingScreen} testID="app-loading-splash" />;
  }

  const showPinLock = isAuthenticated && isLocked && hasPinSet && !isPasswordRecovery && !showVideoSplash;
  const showTrialLock = isAuthenticated && !isPasswordRecovery && !showVideoSplash && !showPinLock && isTrialExpired;

  return (
    <View style={styles.appContainer} onLayout={handleAppLayout} testID="app-content-root">
      {showVideoSplash && (
        <VideoSplashScreen onFinish={() => setShowVideoSplash(false)} />
      )}
      {!showVideoSplash && showPinLock ? (
        <PinLockScreen />
      ) : !showVideoSplash && showTrialLock ? (
        <TrialLockScreen />
      ) : (
        <RootLayoutNav />
      )}
    </View>
  );
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-item" options={{ title: "Add Item", presentation: "modal" }} />
      <Stack.Screen name="edit-item" options={{ title: "Edit Item", presentation: "modal" }} />
      <Stack.Screen name="item-detail" options={{ title: "Item Details" }} />
      <Stack.Screen name="paywall" options={{ title: "Upgrade", presentation: "modal" }} />
      <Stack.Screen name="refund-policy" options={{ title: "Refund & Cancellation Policy" }} />
      <Stack.Screen name="pin-setup" options={{ title: "Set Up PIN", presentation: "modal", headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ title: "Reset Password", headerShown: false }} />
      <Stack.Screen name="admin-login" options={{ title: "Admin Login" }} />
      <Stack.Screen name="admin-dashboard" options={{ title: "Admin Dashboard" }} />
      <Stack.Screen name="admin-portal" options={{ title: "Admin Portal" }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.appContainer}>
          <AuthProvider>
            <SubscriptionProvider>
              <StashProvider>
                <AdminProvider>
                  <AppContent />
                </AdminProvider>
              </StashProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#F5F0EB",
  },
});
