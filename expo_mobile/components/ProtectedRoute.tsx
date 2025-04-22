import { useAuth } from '@/components/AuthContext';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function ProtectedRoute({ roles, children }: {
  roles: Array<'admin' | 'teacher' | 'student'>;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!roles.includes(user.role)) {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {children}
    </>
  );
}