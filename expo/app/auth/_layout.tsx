// v1.1
// PutHere App - Auth Layout
import React from 'react';
import { Stack } from 'expo-router';
import AuthColors from '@/constants/authColors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AuthColors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="contact-support" options={{ headerShown: true, title: 'Contact Support', headerStyle: { backgroundColor: AuthColors.background }, headerTintColor: AuthColors.text }} />
    </Stack>
  );
}
