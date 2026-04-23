import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase, getRedirectUrl } from '@/lib/supabase';
import { vanillaClient } from '@/lib/trpc';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  authMethod?: 'email' | 'apple' | 'google';
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

const HAS_LOGGED_IN_KEY = 'stash_has_logged_in';
const getBiometricKey = (userId: string) => `stash_biometric_enabled_${userId}`;
const getPinKey = (userId: string) => `stash_pin_${userId}`;
const getAutoLockKey = (userId: string) => `stash_auto_lock_timeout_${userId}`;
const SHARED_USERS_KEY = 'stash_shared_users';

export type AutoLockTimeout = 'immediately' | '1min' | '5min' | 'never';

export interface SharedUserPermissions {
  canViewProfile: boolean;
  canViewItems: boolean;
  canEditItems: boolean;
  canAddItems: boolean;
  canDeleteItems: boolean;
  allowAllCategories: boolean;
  allowedCategories: string[];
}

export const DEFAULT_PERMISSIONS: SharedUserPermissions = {
  canViewProfile: false,
  canViewItems: true,
  canEditItems: false,
  canAddItems: false,
  canDeleteItems: false,
  allowAllCategories: true,
  allowedCategories: [],
};

export interface SharedUser {
  email: string;
  invitedAt: string;
  status: 'pending' | 'accepted';
  permissions: SharedUserPermissions;
}

function profileFromSupabaseUser(user: {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): UserProfile {
  const meta = user.user_metadata ?? {};
  const provider = (user.app_metadata?.provider as string) ?? 'email';
  return {
    id: user.id,
    name: (meta.display_name as string) ?? (meta.full_name as string) ?? (meta.name as string) ?? 'User',
    email: user.email ?? '',
    avatarUrl: (meta.avatar_url as string) ?? null,
    createdAt: user.created_at ?? new Date().toISOString(),
    authMethod: provider === 'apple' ? 'apple' : 'email',
    emailVerified: !!user.email_confirmed_at,
    twoFactorEnabled: (meta.two_factor_enabled as boolean) ?? false,
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinLoading, setIsPinLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [isNewSignUp, setIsNewSignUp] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [autoLockTimeout, setAutoLockTimeoutState] = useState<AutoLockTimeout>('immediately');
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasInitializedLock = useRef(false);
  const backgroundTimestamp = useRef<number | null>(null);
  const passwordRecoveryRef = useRef(false);

  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [pending2FAEmail, setPending2FAEmail] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HAS_LOGGED_IN_KEY)
      .then(val => setHasLoggedInBefore(val === 'true'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setBiometricAvailable(false);
      return;
    }
    const checkBio = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled);
        if (compatible && enrolled) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType(Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType('Iris');
          }
        }
        console.log('Biometric check: compatible=', compatible, 'enrolled=', enrolled);
      } catch (err) {
        console.log('Biometric check error:', err);
        setBiometricAvailable(false);
      }
    };
    void checkBio();
  }, []);

  const markLoggedIn = useCallback(async () => {
    await AsyncStorage.setItem(HAS_LOGGED_IN_KEY, 'true');
    setHasLoggedInBefore(true);
  }, []);

  const loadUserLocalState = useCallback(async (userId: string) => {
    const pin = await AsyncStorage.getItem(getPinKey(userId));
    setHasPinSet(pin !== null);
    const bio = await AsyncStorage.getItem(getBiometricKey(userId));
    setBiometricEnabled(bio === 'true');
    const timeout = await AsyncStorage.getItem(getAutoLockKey(userId));
    if (timeout === '1min' || timeout === '5min' || timeout === 'immediately') {
      setAutoLockTimeoutState(timeout);
    }
    try {
      const shared = await AsyncStorage.getItem(SHARED_USERS_KEY);
      if (shared) setSharedUsers(JSON.parse(shared));
    } catch { setSharedUsers([]); }
  }, []);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.log('Session restore error:', error.message);
          const errMsg = error.message?.toLowerCase() ?? '';
          if (errMsg.includes('refresh token') || errMsg.includes('invalid') || errMsg.includes('not found')) {
            console.log('Invalid refresh token detected, signing out to clear stale session...');
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              console.log('Sign out during cleanup failed:', signOutErr);
            }
          }
          setIsLoading(false);
          setIsPinLoading(false);
          return;
        }

        if (session?.user) {
          const profile = profileFromSupabaseUser(session.user);
          setUser(profile);
          setIsAuthenticated(true);
          console.log('Session restored for:', profile.email, 'ID:', profile.id);

          const pin = await AsyncStorage.getItem(getPinKey(profile.id));
          setHasPinSet(pin !== null);

          const bio = await AsyncStorage.getItem(getBiometricKey(profile.id));
          setBiometricEnabled(bio === 'true');

          if (pin !== null) {
            setIsLocked(true);
            hasInitializedLock.current = true;
          }
        } else {
          console.log('No active session found');
        }
      } catch (err: unknown) {
        console.log('Session restore exception:', err);
        const errMsg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        if (errMsg.includes('refresh token') || errMsg.includes('invalid') || errMsg.includes('not found')) {
          console.log('Invalid refresh token in exception, signing out to clear stale session...');
          try {
            await supabase.auth.signOut();
          } catch (signOutErr) {
            console.log('Sign out during cleanup failed:', signOutErr);
          }
          if (mounted) {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsPinLoading(false);
        }
      }
    };

    void restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('Supabase auth event:', event, 'user:', session?.user?.email);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setHasPinSet(false);
          setBiometricEnabled(false);
          setIsLocked(false);
          setIsNewSignUp(false);
          setJustLoggedIn(false);
          setIsPasswordRecovery(false);
          setPendingResetEmail(null);
          setResetStep('idle');
          passwordRecoveryRef.current = false;
          hasInitializedLock.current = false;
          queryClient.clear();
        } else if (event === 'PASSWORD_RECOVERY' && session?.user) {
          console.log('Password recovery event detected for:', session.user.email);
          const profile = profileFromSupabaseUser(session.user);
          setUser(profile);
          setIsAuthenticated(true);
          setIsPasswordRecovery(true);
          setIsLocked(false);
          passwordRecoveryRef.current = true;
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('SIGNED_IN event for:', session.user.email);
          const profile = profileFromSupabaseUser(session.user);
          setUser(profile);
          setIsAuthenticated(true);
          setIsLocked(false);
          if (passwordRecoveryRef.current) {
            console.log('SIGNED_IN after PASSWORD_RECOVERY — keeping recovery mode');
          } else {
            setIsPasswordRecovery(false);
          }

          const createdAt = new Date(session.user.created_at).getTime();
          const isNew = (Date.now() - createdAt) < 120000;
          if (isNew) {
            console.log('New user detected from deep link sign-in');
            setIsNewSignUp(true);
          }

          await loadUserLocalState(profile.id);
          await markLoggedIn();
          console.log('Deep link sign-in complete for:', profile.email);
        } else if ((event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
          const profile = profileFromSupabaseUser(session.user);
          setUser(profile);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient, loadUserLocalState, markLoggedIn]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        backgroundTimestamp.current = Date.now();
        if (hasPinSet && isAuthenticated && autoLockTimeout === 'immediately' && autoLockTimeout !== 'never') {
          console.log('App going to background, locking immediately...');
          setIsLocked(true);
        }
      }
      if (
        (appStateRef.current === 'inactive' || appStateRef.current === 'background') &&
        nextAppState === 'active'
      ) {
        if (hasPinSet && isAuthenticated && !isLocked && autoLockTimeout !== 'immediately' && autoLockTimeout !== 'never' && backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          const thresholdMs = autoLockTimeout === '1min' ? 60000 : 300000;
          if (elapsed >= thresholdMs) {
            console.log('App returning after', elapsed, 'ms, locking...');
            setIsLocked(true);
          }
        }
        backgroundTimestamp.current = null;
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [hasPinSet, isAuthenticated, isLocked, autoLockTimeout]);

  const pendingSignUpPasswordRef = useRef<string | null>(null);



  const initiateSignUp = useCallback(async (
    name: string, email: string, password: string
  ): Promise<{ success: boolean; error?: string; needsVerification?: boolean; directSignUp?: boolean; emailFailed?: boolean }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('Initiating signup via backend for:', normalizedEmail);
      pendingSignUpPasswordRef.current = password;

      const result = await vanillaClient.signupVerification.initiateSignup.mutate({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });

      console.log('initiateSignUp: backend result:', JSON.stringify(result));

      if (!result.success) {
        pendingSignUpPasswordRef.current = null;
        return { success: false, error: result.error ?? 'Sign up failed.' };
      }

      if (result.needsVerification) {
        setPendingVerificationEmail(normalizedEmail);
        console.log('Signup initiated, 6-digit verification code sent to:', normalizedEmail);
        return { success: true, needsVerification: true };
      }

      return { success: true, needsVerification: true };
    } catch (err: unknown) {
      console.log('Signup exception:', err);
      pendingSignUpPasswordRef.current = null;
      const rawMessage = err instanceof Error ? err.message : String(err);
      let message = 'Something went wrong. Please try again.';
      if (rawMessage.includes('JSON Parse') || rawMessage.includes('Unexpected character') || rawMessage.includes('Unexpected token')) {
        message = 'Server is temporarily unavailable. Please try again in a moment.';
      } else if (rawMessage.includes('Network') || rawMessage.includes('fetch') || rawMessage.includes('Load failed') || rawMessage.includes('load failed')) {
        message = 'Network error. Please check your connection and try again.';
      }
      return { success: false, error: message };
    }
  }, []);

  const verifyEmailAndSignUp = useCallback(async (
    inputCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pendingVerificationEmail) {
        return { success: false, error: 'No pending verification. Please start sign up again.' };
      }

      console.log('Verifying signup code via backend for:', pendingVerificationEmail);

      const result = await vanillaClient.signupVerification.verifyCode.mutate({
        email: pendingVerificationEmail,
        code: inputCode.trim(),
      });

      console.log('verifyEmailAndSignUp: backend result:', JSON.stringify(result));

      if (!result.success) {
        return { success: false, error: result.error ?? 'Verification failed.' };
      }

      console.log('Email verified via backend, now signing in with password...');
      const storedPassword = pendingSignUpPasswordRef.current;
      if (!storedPassword) {
        return { success: false, error: 'Session expired. Please sign up again.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: pendingVerificationEmail,
        password: storedPassword,
      });

      if (error) {
        console.log('Post-verification sign-in error:', error.message);
        return { success: false, error: 'Email verified but sign-in failed. Please go back and sign in manually.' };
      }

      if (data.session && data.user) {
        const profile = profileFromSupabaseUser(data.user);
        setUser(profile);
        setIsAuthenticated(true);
        setIsNewSignUp(true);
        setJustLoggedIn(true);
        setPendingVerificationEmail(null);
        pendingSignUpPasswordRef.current = null;
        await loadUserLocalState(profile.id);
        await markLoggedIn();
        console.log('Email verified, signup complete:', profile.email);
        return { success: true };
      }

      return { success: false, error: 'Verification succeeded but sign-in failed. Please sign in manually.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      console.log('Verify exception:', err);
      return { success: false, error: message };
    }
  }, [pendingVerificationEmail, loadUserLocalState, markLoggedIn]);

  const resendVerificationCode = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pendingVerificationEmail) {
        return { success: false, error: 'No pending verification.' };
      }

      console.log('resendVerificationCode: resending via backend for:', pendingVerificationEmail);

      const result = await vanillaClient.signupVerification.resendCode.mutate({
        email: pendingVerificationEmail,
      });

      console.log('resendVerificationCode: result:', JSON.stringify(result));

      if (result.success) {
        console.log('resendVerificationCode: code resent successfully');
        return { success: true };
      }

      return { success: false, error: result.error ?? 'Failed to resend code.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code.';
      console.log('resendVerificationCode: exception:', err);
      return { success: false, error: message };
    }
  }, [pendingVerificationEmail]);

  const cancelPendingVerification = useCallback(() => {
    setPendingVerificationEmail(null);
    pendingSignUpPasswordRef.current = null;
  }, []);

  const attemptDirectSignIn = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pendingVerificationEmail || !pendingSignUpPasswordRef.current) {
        return { success: false, error: 'No pending signup credentials.' };
      }

      console.log('Attempting direct sign-in for:', pendingVerificationEmail);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: pendingVerificationEmail,
        password: pendingSignUpPasswordRef.current,
      });

      if (error) {
        console.log('Direct sign-in attempt failed:', error.message);
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return { success: false, error: 'Email not yet confirmed. Please check your inbox for the verification code, or ask an admin to disable email confirmation in Supabase.' };
        }
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        const profile = profileFromSupabaseUser(data.user);
        setUser(profile);
        setIsAuthenticated(true);
        setIsNewSignUp(true);
        setJustLoggedIn(true);
        setPendingVerificationEmail(null);
        pendingSignUpPasswordRef.current = null;
        await loadUserLocalState(profile.id);
        await markLoggedIn();
        console.log('Direct sign-in succeeded:', profile.email);
        return { success: true };
      }

      return { success: false, error: 'Sign in failed.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      console.log('Direct sign-in exception:', err);
      return { success: false, error: message };
    }
  }, [pendingVerificationEmail, loadUserLocalState, markLoggedIn]);

  const signIn = useCallback(async (
    email: string, password: string
  ): Promise<{ success: boolean; error?: string; needs2FA?: boolean }> => {
    try {
      console.log('Signing in with Supabase:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Sign in error:', error.message);
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return { success: false, error: 'Please verify your email before signing in. Check your inbox for the verification code.' };
        }
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          return { success: false, error: 'Invalid email or password.' };
        }
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        const twoFactorEnabled = data.user.user_metadata?.two_factor_enabled === true;

        if (twoFactorEnabled) {
          console.log('2FA enabled for user, signing out and sending OTP to:', email);
          await supabase.auth.signOut();

          const { error: otpError } = await supabase.auth.signInWithOtp({ email });
          if (otpError) {
            console.log('2FA OTP send error:', otpError.message);
            return { success: false, error: 'Failed to send verification code: ' + otpError.message };
          }

          setPending2FAEmail(email);
          return { success: true, needs2FA: true };
        }

        const profile = profileFromSupabaseUser(data.user);
        setUser(profile);
        setIsAuthenticated(true);
        setJustLoggedIn(true);
        await loadUserLocalState(profile.id);
        await markLoggedIn();
        console.log('Sign in successful:', profile.email, 'ID:', profile.id);
        return { success: true };
      }

      return { success: false, error: 'Sign in failed. Please try again.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      console.log('Sign in exception:', err);
      return { success: false, error: message };
    }
  }, [loadUserLocalState, markLoggedIn]);

  const verify2FAAndSignIn = useCallback(async (
    inputCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pending2FAEmail) {
        return { success: false, error: 'No pending 2FA verification.' };
      }

      console.log('Verifying 2FA OTP for:', pending2FAEmail);

      const { data, error } = await supabase.auth.verifyOtp({
        email: pending2FAEmail,
        token: inputCode,
        type: 'email',
      });

      if (error) {
        console.log('2FA verify error:', error.message);
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        const profile = profileFromSupabaseUser(data.user);
        setUser(profile);
        setIsAuthenticated(true);
        setJustLoggedIn(true);
        setPending2FAEmail(null);
        await loadUserLocalState(profile.id);
        await markLoggedIn();
        console.log('2FA sign in successful:', profile.email);
        return { success: true };
      }

      return { success: false, error: 'Verification failed.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      console.log('2FA verify exception:', err);
      return { success: false, error: message };
    }
  }, [pending2FAEmail, loadUserLocalState, markLoggedIn]);

  const resend2FACode = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pending2FAEmail) {
        return { success: false, error: 'No pending 2FA verification.' };
      }

      const { error } = await supabase.auth.signInWithOtp({ email: pending2FAEmail });
      if (error) {
        return { success: false, error: error.message };
      }

      console.log('2FA code resent to:', pending2FAEmail);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code.';
      return { success: false, error: message };
    }
  }, [pending2FAEmail]);

  const cancel2FA = useCallback(() => {
    setPending2FAEmail(null);
  }, []);

  const _signInWithAppleUnused = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (Platform.OS === 'web') {
        return { success: false, error: 'Apple Sign-In is not available on web.' };
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Apple Sign-In is not available on this device.' };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { success: false, error: 'Failed to get Apple identity token.' };
      }

      console.log('Apple credential received, signing in with Supabase...');

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.log('Supabase Apple sign in error:', error.message);
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        const profile = profileFromSupabaseUser(data.user);

        if (credential.fullName) {
          const appleName = [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean).join(' ');
          if (appleName && (profile.name === 'User' || !profile.name)) {
            await supabase.auth.updateUser({
              data: { display_name: appleName, auth_method: 'apple' },
            });
            profile.name = appleName;
          }
        }

        setUser(profile);
        setIsAuthenticated(true);
        setJustLoggedIn(true);

        const createdAt = new Date(data.user.created_at).getTime();
        const isNew = (Date.now() - createdAt) < 60000;
        if (isNew) setIsNewSignUp(true);

        await loadUserLocalState(profile.id);
        await markLoggedIn();
        console.log('Apple sign in successful:', profile.email);
        return { success: true };
      }

      return { success: false, error: 'Apple sign-in failed.' };
    } catch (err: unknown) {
      const anyErr = err as { code?: string };
      if (anyErr?.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'Sign-in was cancelled.' };
      }
      console.log('Apple sign in exception:', err);
      return { success: false, error: 'Apple sign-in failed. Please try again.' };
    }
  }, [loadUserLocalState, markLoggedIn]);

  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Starting Google OAuth flow...');

      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin
        : AuthSession.makeRedirectUri({ path: '/' });

      console.log('Google OAuth redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) {
        console.log('Google OAuth error:', error.message);
        return { success: false, error: error.message };
      }

      if (Platform.OS === 'web') {
        if (data?.url) {
          window.location.href = data.url;
        }
        return { success: true };
      }

      if (data?.url) {
        console.log('Opening Google OAuth URL in browser...');
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        console.log('WebBrowser result type:', result.type);

        if (result.type === 'success' && result.url) {
          console.log('Google OAuth callback URL received');
          const url = result.url;
          const hashIndex = url.indexOf('#');
          const queryIndex = url.indexOf('?');
          let paramString = '';
          if (hashIndex !== -1) {
            paramString = url.substring(hashIndex + 1);
          } else if (queryIndex !== -1) {
            paramString = url.substring(queryIndex + 1);
          }
          const searchParams = new URLSearchParams(paramString);

          const accessToken = searchParams.get('access_token');
          const refreshToken = searchParams.get('refresh_token');
          const errorParam = searchParams.get('error_description') || searchParams.get('error');
          if (errorParam) {
            console.log('Google OAuth callback error:', errorParam);
            return { success: false, error: errorParam };
          }

          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.log('Google OAuth set session error:', sessionError.message);
              return { success: false, error: sessionError.message };
            }

            if (sessionData.session && sessionData.user) {
              const profile = profileFromSupabaseUser(sessionData.user);
              setUser(profile);
              setIsAuthenticated(true);
              setJustLoggedIn(true);

              const createdAt = new Date(sessionData.user.created_at).getTime();
              const isNew = (Date.now() - createdAt) < 60000;
              if (isNew) setIsNewSignUp(true);

              await loadUserLocalState(profile.id);
              await markLoggedIn();
              console.log('Google sign in successful:', profile.email);
              return { success: true };
            }
          }

          console.log('Google OAuth: no tokens found in callback URL');
          return { success: false, error: 'Failed to complete Google sign-in.' };
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          return { success: false, error: 'Sign-in was cancelled.' };
        }

        return { success: false, error: 'Google sign-in failed.' };
      }

      return { success: false, error: 'No OAuth URL returned.' };
    } catch (err: unknown) {
      console.log('Google sign in exception:', err);
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    }
  }, [loadUserLocalState, markLoggedIn]);

  const signOut = useCallback(async () => {
    console.log('Signing out...');
    setUser(null);
    setIsAuthenticated(false);
    setIsLocked(false);
    setIsNewSignUp(false);
    setJustLoggedIn(false);
    setPendingVerificationEmail(null);
    setPending2FAEmail(null);
    hasInitializedLock.current = false;
    await supabase.auth.signOut();
    queryClient.clear();
    console.log('Signed out');
  }, [queryClient]);

  const clearNewSignUp = useCallback(() => {
    setIsNewSignUp(false);
  }, []);

  const updateProfile = useCallback(async (
    updates: Partial<Pick<UserProfile, 'name' | 'avatarUrl'>>
  ) => {
    if (!user) return;
    try {
      const metadata: Record<string, string | null> = {};
      if (updates.name !== undefined) metadata.display_name = updates.name;
      if (updates.avatarUrl !== undefined) metadata.avatar_url = updates.avatarUrl;

      const { error } = await supabase.auth.updateUser({ data: metadata });
      if (error) {
        console.log('Update profile error:', error.message);
        return;
      }

      setUser(prev => prev ? { ...prev, ...updates } : null);
      console.log('Profile updated');
    } catch (err) {
      console.log('Update profile exception:', err);
    }
  }, [user]);

  const changePassword = useCallback(async (
    currentPassword: string, newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user?.email) return { success: false, error: 'Not authenticated.' };

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) {
        return { success: false, error: 'Current password is incorrect.' };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }

      console.log('Password changed for:', user.email);
      return { success: true };
    } catch (err) {
      console.log('Change password error:', err);
      return { success: false, error: 'Failed to change password.' };
    }
  }, [user]);

  const [pendingResetEmail, setPendingResetEmail] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState<'idle' | 'code' | 'new-password'>('idle');



  const resetPassword = useCallback(async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('resetPassword: requesting code via backend for:', normalizedEmail);

      const result = await vanillaClient.passwordReset.requestCode.mutate({ email: normalizedEmail });
      console.log('resetPassword: result:', JSON.stringify(result));

      if (result?.success) {
        console.log('resetPassword: code request accepted for:', normalizedEmail);
        setPendingResetEmail(normalizedEmail);
        setResetStep('code');
        return { success: true };
      }

      return { success: false, error: result?.error ?? 'Failed to send reset code.' };
    } catch (err) {
      console.log('resetPassword: exception:', err);
      const rawMessage = err instanceof Error ? err.message : String(err);
      console.log('resetPassword: raw error message:', rawMessage);
      let message = 'Failed to send reset code. Please try again.';
      if (rawMessage.includes('JSON Parse') || rawMessage.includes('Unexpected character') || rawMessage.includes('Unexpected token')) {
        message = 'Server is temporarily unavailable. Please try again in a moment.';
      } else if (rawMessage.includes('Network') || rawMessage.includes('fetch') || rawMessage.includes('Load failed') || rawMessage.includes('load failed')) {
        message = 'Network error. Please check your connection and try again.';
      }
      return { success: false, error: message };
    }
  }, []);

  const verifyResetCode = useCallback(async (
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pendingResetEmail) {
        return { success: false, error: 'No pending password reset.' };
      }

      console.log('verifyResetCode: verifying code via backend for:', pendingResetEmail);

      const result = await vanillaClient.passwordReset.verifyCode.mutate({ email: pendingResetEmail, code: code.trim() });
      console.log('verifyResetCode: result:', JSON.stringify(result));

      if (result?.success) {
        setResetStep('new-password');
        console.log('verifyResetCode: code verified for:', pendingResetEmail);
        return { success: true };
      }

      return { success: false, error: result?.error ?? 'Verification failed. Please try again.' };
    } catch (err) {
      console.log('verifyResetCode: exception:', err);
      const message = err instanceof Error ? err.message : 'Failed to verify code.';
      return { success: false, error: message };
    }
  }, [pendingResetEmail]);

  const [pendingResetCode, setPendingResetCode] = useState<string | null>(null);

  const completeResetWithNewPassword = useCallback(async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (resetStep !== 'new-password' || !pendingResetEmail || !pendingResetCode) {
        return { success: false, error: 'No verified reset session.' };
      }

      console.log('completeResetWithNewPassword: completing via backend for:', pendingResetEmail);

      const result = await vanillaClient.passwordReset.completeReset.mutate({ email: pendingResetEmail, code: pendingResetCode, newPassword });
      console.log('completeResetWithNewPassword: result:', JSON.stringify(result));

      if (result?.success) {
        setPendingResetEmail(null);
        setPendingResetCode(null);
        setResetStep('idle');
        console.log('completeResetWithNewPassword: password updated successfully');
        return { success: true };
      }

      return { success: false, error: result?.error ?? 'Failed to update password.' };
    } catch (err) {
      console.log('completeResetWithNewPassword: exception:', err);
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      return { success: false, error: message };
    }
  }, [resetStep, pendingResetEmail, pendingResetCode]);

  const cancelPasswordReset = useCallback(() => {
    setPendingResetEmail(null);
    setPendingResetCode(null);
    setResetStep('idle');
  }, []);

  const resendResetCode = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pendingResetEmail) {
        return { success: false, error: 'No pending reset.' };
      }

      console.log('resendResetCode: resending code via backend for:', pendingResetEmail);

      const result = await vanillaClient.passwordReset.resendCode.mutate({ email: pendingResetEmail });
      console.log('resendResetCode: result:', JSON.stringify(result));

      if (result?.success) {
        console.log('resendResetCode: code resent for:', pendingResetEmail);
        return { success: true };
      }

      return { success: false, error: result?.error ?? 'Failed to resend code.' };
    } catch (err) {
      console.log('resendResetCode: exception:', err);
      const message = err instanceof Error ? err.message : 'Failed to resend code.';
      return { success: false, error: message };
    }
  }, [pendingResetEmail]);

  const completePasswordReset = useCallback(async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isPasswordRecovery) {
        return { success: false, error: 'No password recovery session active.' };
      }

      console.log('Completing password reset via recovery event...');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.log('Password update error:', error.message);
        return { success: false, error: error.message };
      }

      setIsPasswordRecovery(false);
      console.log('Password reset completed successfully');
      return { success: true };
    } catch (err) {
      console.log('Complete password reset exception:', err);
      return { success: false, error: 'Failed to update password.' };
    }
  }, [isPasswordRecovery]);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    passwordRecoveryRef.current = false;
  }, []);

  const toggle2FA = useCallback(async (
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'Not authenticated.' };

      const { error } = await supabase.auth.updateUser({
        data: { two_factor_enabled: enabled },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setUser(prev => prev ? { ...prev, twoFactorEnabled: enabled } : null);
      console.log('2FA toggled:', enabled, 'for:', user.email);
      return { success: true };
    } catch (err) {
      console.log('Toggle 2FA error:', err);
      return { success: false, error: 'Failed to update 2FA setting.' };
    }
  }, [user]);

  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const id = user?.id ?? 'guest';
      await AsyncStorage.setItem(getPinKey(id), pin);
      setHasPinSet(true);
      console.log('PIN set for user:', id);
      return true;
    } catch (err) {
      console.log('Set PIN error:', err);
      return false;
    }
  }, [user]);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const id = user?.id ?? 'guest';
      const storedPin = await AsyncStorage.getItem(getPinKey(id));
      if (storedPin === pin) {
        setIsLocked(false);
        console.log('PIN verified, unlocking app');
        return true;
      }
      console.log('Invalid PIN attempt');
      return false;
    } catch (err) {
      console.log('Verify PIN error:', err);
      return false;
    }
  }, [user]);

  const removePin = useCallback(async (): Promise<boolean> => {
    try {
      const id = user?.id ?? 'guest';
      await AsyncStorage.removeItem(getPinKey(id));
      setHasPinSet(false);
      setIsLocked(false);
      console.log('PIN removed for user:', id);
      return true;
    } catch (err) {
      console.log('Remove PIN error:', err);
      return false;
    }
  }, [user]);

  const changePin = useCallback(async (
    oldPin: string, newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const id = user?.id ?? 'guest';
      const storedPin = await AsyncStorage.getItem(getPinKey(id));
      if (storedPin !== oldPin) return { success: false, error: 'Current PIN is incorrect.' };
      await AsyncStorage.setItem(getPinKey(id), newPin);
      console.log('PIN changed');
      return { success: true };
    } catch (err) {
      console.log('Change PIN error:', err);
      return { success: false, error: 'Failed to change PIN.' };
    }
  }, [user]);

  const unlockApp = useCallback(() => {
    setIsLocked(false);
  }, []);

  const loginWithPin = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('loginWithPin: No Supabase session');
        return false;
      }
      const profile = profileFromSupabaseUser(session.user);
      const pin = await AsyncStorage.getItem(getPinKey(profile.id));
      if (!pin) {
        console.log('loginWithPin: No PIN set for user:', profile.id);
        return false;
      }
      setUser(profile);
      setIsAuthenticated(true);
      setHasPinSet(true);
      setIsLocked(true);
      setJustLoggedIn(false);
      hasInitializedLock.current = true;
      console.log('loginWithPin: Restored session in locked state for:', profile.email);
      return true;
    } catch (err) {
      console.log('loginWithPin error:', err);
      return false;
    }
  }, []);

  const toggleBiometric = useCallback(async (enabled: boolean): Promise<boolean> => {
    try {
      if (enabled && Platform.OS !== 'web') {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricType}`,
          cancelLabel: 'Cancel',
          disableDeviceFallback: true,
          fallbackLabel: 'Cancel',
        });
        if (!result.success) {
          console.log('Biometric enrollment cancelled');
          return false;
        }
      }
      if (!user?.id) return false;
      await AsyncStorage.setItem(getBiometricKey(user.id), enabled ? 'true' : 'false');
      setBiometricEnabled(enabled);
      console.log('Biometric enabled:', enabled);
      return true;
    } catch (err) {
      console.log('Toggle biometric error:', err);
      return false;
    }
  }, [biometricType, user]);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    console.log('authenticateWithBiometric called — available:', biometricAvailable, 'enabled:', biometricEnabled, 'platform:', Platform.OS);
    if (Platform.OS === 'web') {
      console.log('Biometric: skipped on web');
      return false;
    }
    if (!biometricAvailable) {
      console.log('Biometric: hardware not available');
      return false;
    }
    if (!biometricEnabled) {
      console.log('Biometric: not enabled by user');
      return false;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Unlock with ${biometricType}`,
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: true,
      });
      console.log('Biometric auth result:', JSON.stringify(result));
      if (result.success) {
        setIsLocked(false);
        console.log('Biometric unlock successful — isLocked set to false');
        return true;
      }
      console.log('Biometric unlock failed:', result.error);
      return false;
    } catch (err) {
      console.log('Biometric auth error:', err);
      return false;
    }
  }, [biometricAvailable, biometricEnabled, biometricType]);

  const setAutoLockTimeout = useCallback(async (timeout: AutoLockTimeout): Promise<boolean> => {
    try {
      if (!user?.id) return false;
      await AsyncStorage.setItem(getAutoLockKey(user.id), timeout);
      setAutoLockTimeoutState(timeout);
      console.log('Auto-lock timeout set to:', timeout);
      return true;
    } catch (err) {
      console.log('Set auto-lock timeout error:', err);
      return false;
    }
  }, [user]);

  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user?.id) return { success: false, error: 'Not authenticated.' };
      console.log('Deleting account for:', user.email);
      await AsyncStorage.multiRemove([
        getPinKey(user.id),
        getBiometricKey(user.id),
        getAutoLockKey(user.id),
        SHARED_USERS_KEY,
        'stash_user_profile',
        'stash_items',
        'stash_categories',
        'stash_locations',
        HAS_LOGGED_IN_KEY,
      ]);
      setUser(null);
      setIsAuthenticated(false);
      setIsLocked(false);
      setHasPinSet(false);
      setBiometricEnabled(false);
      setIsNewSignUp(false);
      setJustLoggedIn(false);
      hasInitializedLock.current = false;
      await supabase.auth.signOut();
      queryClient.clear();
      console.log('Account deleted and signed out');
      return { success: true };
    } catch (err) {
      console.log('Delete account error:', err);
      return { success: false, error: 'Failed to delete account.' };
    }
  }, [user, queryClient]);

  const inviteUser = useCallback(async (email: string, permissions?: SharedUserPermissions): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user?.id) return { success: false, error: 'Not authenticated.' };
      if (email.toLowerCase() === user.email.toLowerCase()) {
        return { success: false, error: 'You cannot invite yourself.' };
      }
      const existing = sharedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) return { success: false, error: 'This user is already invited.' };
      const newShared: SharedUser = {
        email: email.toLowerCase(),
        invitedAt: new Date().toISOString(),
        status: 'pending',
        permissions: permissions ?? { ...DEFAULT_PERMISSIONS },
      };
      const updated = [...sharedUsers, newShared];
      await AsyncStorage.setItem(SHARED_USERS_KEY, JSON.stringify(updated));
      setSharedUsers(updated);
      console.log('User invited:', email, 'permissions:', JSON.stringify(permissions ?? DEFAULT_PERMISSIONS));
      return { success: true };
    } catch (err) {
      console.log('Invite user error:', err);
      return { success: false, error: 'Failed to invite user.' };
    }
  }, [user, sharedUsers]);

  const updateSharedUserPermissions = useCallback(async (email: string, permissions: SharedUserPermissions): Promise<boolean> => {
    try {
      const updated = sharedUsers.map(u =>
        u.email.toLowerCase() === email.toLowerCase() ? { ...u, permissions } : u
      );
      await AsyncStorage.setItem(SHARED_USERS_KEY, JSON.stringify(updated));
      setSharedUsers(updated);
      console.log('Permissions updated for:', email, JSON.stringify(permissions));
      return true;
    } catch (err) {
      console.log('Update permissions error:', err);
      return false;
    }
  }, [sharedUsers]);

  const removeSharedUser = useCallback(async (email: string): Promise<boolean> => {
    try {
      const updated = sharedUsers.filter(u => u.email.toLowerCase() !== email.toLowerCase());
      await AsyncStorage.setItem(SHARED_USERS_KEY, JSON.stringify(updated));
      setSharedUsers(updated);
      console.log('Shared user removed:', email);
      return true;
    } catch (err) {
      console.log('Remove shared user error:', err);
      return false;
    }
  }, [sharedUsers]);

  return useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    isPinLoading,
    isLocked,
    hasPinSet,
    hasLoggedInBefore,
    isNewSignUp,
    justLoggedIn,
    biometricEnabled,
    biometricAvailable,
    biometricType,
    pendingVerification: pendingVerificationEmail !== null,
    pending2FA: pending2FAEmail !== null,
    initiateSignUp,
    verifyEmailAndSignUp,
    resendVerificationCode,
    cancelPendingVerification,
    attemptDirectSignIn,
    signIn,
    verify2FAAndSignIn,
    resend2FACode,
    cancel2FA,
    signOut,
    updateProfile,
    setPin,
    verifyPin,
    removePin,
    unlockApp,
    loginWithPin,
    toggleBiometric,
    authenticateWithBiometric,
    clearNewSignUp,
    changePassword,
    changePin,
    resetPassword,
    verifyResetCode,
    completeResetWithNewPassword,
    cancelPasswordReset,
    resendResetCode,
    resetStep,
    setPendingResetCode,
    completePasswordReset,
    clearPasswordRecovery,
    isPasswordRecovery,
    toggle2FA,
    autoLockTimeout,
    setAutoLockTimeout,
    deleteAccount,
    sharedUsers,
    inviteUser,
    removeSharedUser,
    updateSharedUserPermissions,
  }), [
    user, isAuthenticated, isLoading, isPinLoading, isLocked, hasPinSet,
    hasLoggedInBefore, isNewSignUp, justLoggedIn, biometricEnabled,
    biometricAvailable, biometricType, pendingVerificationEmail, pending2FAEmail,
    initiateSignUp, verifyEmailAndSignUp, resendVerificationCode,
    cancelPendingVerification, attemptDirectSignIn, signIn, verify2FAAndSignIn, resend2FACode,
    cancel2FA, signOut, updateProfile, setPin, verifyPin,
    removePin, unlockApp, loginWithPin, toggleBiometric, authenticateWithBiometric,
    clearNewSignUp, changePassword, changePin, resetPassword, verifyResetCode,
    completeResetWithNewPassword, cancelPasswordReset, resendResetCode, resetStep, setPendingResetCode,
    completePasswordReset, clearPasswordRecovery, isPasswordRecovery, toggle2FA,
    autoLockTimeout, setAutoLockTimeout, deleteAccount, sharedUsers, inviteUser, removeSharedUser, updateSharedUserPermissions,
  ]);
});
