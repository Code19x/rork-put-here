// PutHere App - Categories Layout v1.1
import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

export default function CategoriesLayout() {
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
          title: "Categories",
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
