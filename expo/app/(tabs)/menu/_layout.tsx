// PutHere App - Menu Layout v1.1
import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

export default function MenuLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Menu",
          headerTitleStyle: {
            fontWeight: "700" as const,
            fontSize: 20,
            color: Colors.text,
          },
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: "My Profile",
          headerTitleStyle: {
            fontWeight: "700" as const,
            fontSize: 20,
            color: Colors.text,
          },
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Settings",
          headerTitleStyle: {
            fontWeight: "700" as const,
            fontSize: 20,
            color: Colors.text,
          },
        }}
      />
      <Stack.Screen
        name="contact"
        options={{
          title: "Contact Us",
          headerTitleStyle: {
            fontWeight: "700" as const,
            fontSize: 20,
            color: Colors.text,
          },
        }}
      />
      <Stack.Screen
        name="faqs"
        options={{
          title: "FAQs",
          headerTitleStyle: {
            fontWeight: "700" as const,
            fontSize: 20,
            color: Colors.text,
          },
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: "Privacy Policy",
          headerTitleStyle: {
            fontWeight: "700" as const,
            fontSize: 20,
            color: Colors.text,
          },
        }}
      />
      <Stack.Screen
        name="shared-access"
        options={{
          title: "Shared Access",
          headerTitleStyle: {
            fontWeight: "700" as const,
            fontSize: 20,
            color: Colors.text,
          },
        }}
      />
    </Stack>
  );
}
