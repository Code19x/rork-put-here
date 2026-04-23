import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { UserProfile } from '@/types';

const ADMIN_AUTH_KEY = 'admin_auth_session';
const ADMIN_EMAIL = 'support@puthereapp.com';
const ADMIN_PASSWORD = 'PutHere@Admin2024';

export interface AdminSession {
  email: string;
  isAdmin: true;
  loginAt: string;
}

export interface AppStats {
  totalUsers: number;
  totalItems: number;
  totalCategories: number;
  totalLocations: number;
  activeToday: number;
  newUsersThisWeek: number;
}

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ['admin-session'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(ADMIN_AUTH_KEY);
      return stored ? (JSON.parse(stored) as AdminSession) : null;
    },
  });

  useEffect(() => {
    if (sessionQuery.data !== undefined) {
      setAdminSession(sessionQuery.data);
      setIsAdminAuthenticated(sessionQuery.data !== null);
    }
  }, [sessionQuery.data]);

  const persistSession = useMutation({
    mutationFn: async (session: AdminSession | null) => {
      if (session) {
        await AsyncStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem(ADMIN_AUTH_KEY);
      }
      return session;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-session'] });
    },
  });

  const adminSignIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (email.toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        console.log('Admin sign in failed: invalid credentials');
        return { success: false, error: 'Invalid admin credentials.' };
      }

      const session: AdminSession = {
        email: ADMIN_EMAIL,
        isAdmin: true,
        loginAt: new Date().toISOString(),
      };

      setAdminSession(session);
      setIsAdminAuthenticated(true);
      persistSession.mutate(session);
      console.log('Admin sign in successful');
      return { success: true };
    } catch (error) {
      console.log('Admin sign in error:', error);
      return { success: false, error: 'Something went wrong.' };
    }
  }, [persistSession]);

  const adminSignOut = useCallback(async () => {
    setAdminSession(null);
    setIsAdminAuthenticated(false);
    persistSession.mutate(null);
    console.log('Admin signed out');
  }, [persistSession]);

  const fetchUsers = useCallback(async (): Promise<UserProfile[]> => {
    try {
      const stored = await AsyncStorage.getItem('stash_users');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.log('Error fetching users:', error);
      return [];
    }
  }, []);

  const fetchStats = useCallback(async (): Promise<AppStats> => {
    try {
      const usersRaw = await AsyncStorage.getItem('stash_users');
      const itemsRaw = await AsyncStorage.getItem('stash_items');
      const catsRaw = await AsyncStorage.getItem('stash_categories');
      const locsRaw = await AsyncStorage.getItem('stash_locations');

      const users: UserProfile[] = usersRaw ? JSON.parse(usersRaw) : [];
      const items: unknown[] = itemsRaw ? JSON.parse(itemsRaw) : [];
      const cats: unknown[] = catsRaw ? JSON.parse(catsRaw) : [];
      const locs: unknown[] = locsRaw ? JSON.parse(locsRaw) : [];

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const newUsersThisWeek = users.filter(u => new Date(u.createdAt) > weekAgo).length;

      return {
        totalUsers: users.length,
        totalItems: items.length,
        totalCategories: cats.length,
        totalLocations: locs.length,
        activeToday: Math.min(users.length, Math.max(1, Math.floor(users.length * 0.3))),
        newUsersThisWeek,
      };
    } catch (error) {
      console.log('Error fetching stats:', error);
      return { totalUsers: 0, totalItems: 0, totalCategories: 0, totalLocations: 0, activeToday: 0, newUsersThisWeek: 0 };
    }
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem('stash_users');
      const users: (UserProfile & { password?: string })[] = stored ? JSON.parse(stored) : [];
      const updated = users.filter(u => u.id !== userId);
      await AsyncStorage.setItem('stash_users', JSON.stringify(updated));
      console.log('User deleted:', userId);
      return true;
    } catch (error) {
      console.log('Delete user error:', error);
      return false;
    }
  }, []);

  const clearAllItems = useCallback(async (): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem('stash_items');
      console.log('All items cleared');
      return true;
    } catch (error) {
      console.log('Clear items error:', error);
      return false;
    }
  }, []);

  const isLoading = sessionQuery.isLoading;

  return useMemo(() => ({
    adminSession,
    isAdminAuthenticated,
    isLoading,
    adminSignIn,
    adminSignOut,
    fetchUsers,
    fetchStats,
    deleteUser,
    clearAllItems,
  }), [adminSession, isAdminAuthenticated, isLoading, adminSignIn, adminSignOut, fetchUsers, fetchStats, deleteUser, clearAllItems]);
});
