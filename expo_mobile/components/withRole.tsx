// withRole.tsx
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/components/AuthContext';

export const withRole = (allowedRoles: string[]) => {
  return function RoleProtectedRoute(props: any) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return <ActivityIndicator size="large" />;
    }

    if (!user) {
      return <Redirect href="/login" />;
    }

    if (!allowedRoles.includes(user.role)) {
      return <Redirect href="/unauthorized" />;
    }

    // Render the protected component if the user is authenticated and authorized
    return <props.Component {...props} />;
  };
};
