import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { Mail, Send, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthColors from '@/constants/authColors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/providers/AuthProvider';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactSupportScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const prefilledName = user?.name && user.name !== 'User' ? user.name : '';
  const prefilledEmail = user?.email ?? '';
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sent, setSent] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (prefilledEmail && !email) {
      setEmail(prefilledEmail);
    }
    if (prefilledName && !name) {
      setName(prefilledName);
    }
  }, [prefilledEmail, prefilledName, email, name]);

  const validate = useCallback((): string | null => {
    if (!name.trim()) return 'Please enter your name.';
    if (!email.trim()) return 'Please enter your email address.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address.';
    if (!subject.trim()) return 'Please enter a subject.';
    if (!message.trim()) return 'Please enter a message.';
    return null;
  }, [name, email, subject, message]);

  const sendMutation = trpc.contact.sendMessage.useMutation({
    onSuccess: () => {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSent(true);
      setName(prefilledName);
      setEmail(prefilledEmail);
      setSubject('');
      setMessage('');
      setTimeout(() => setSent(false), 5000);
    },
    onError: (err) => {
      console.error('Contact send error:', err);
      setErrorMsg('We could not send your message. Please try again.');
    },
  });

  const handleSend = useCallback(() => {
    setErrorMsg('');
    setSent(false);
    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    sendMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });
  }, [name, email, subject, message, validate, sendMutation]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Mail color={AuthColors.accent} size={28} />
          </View>
          <Text style={styles.heroTitle}>Contact Support</Text>
          <Text style={styles.heroSubtitle}>
            Having trouble signing in or creating an account? Let us know and we'll help you out.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={AuthColors.inputPlaceholder}
            value={name}
            onChangeText={(t) => { setName(t); setErrorMsg(''); }}
            autoCapitalize="words"
            testID="contact-support-name-input"
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email address"
            placeholderTextColor={AuthColors.inputPlaceholder}
            value={email}
            onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            testID="contact-support-email-input"
          />

          <Text style={styles.label}>SUBJECT</Text>
          <TextInput
            style={styles.input}
            placeholder="What's this about?"
            placeholderTextColor={AuthColors.inputPlaceholder}
            value={subject}
            onChangeText={(t) => { setSubject(t); setErrorMsg(''); }}
            testID="contact-support-subject-input"
          />

          <Text style={styles.label}>MESSAGE</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Describe your issue..."
            placeholderTextColor={AuthColors.inputPlaceholder}
            value={message}
            onChangeText={(t) => { setMessage(t); setErrorMsg(''); }}
            multiline
            textAlignVertical="top"
            testID="contact-support-message-input"
          />

          {errorMsg !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {sent && (
            <View style={styles.successBanner}>
              <CheckCircle color={AuthColors.success} size={20} />
              <Text style={styles.successText}>Your message has been sent. We'll get back to you soon.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.sendBtn, sendMutation.isPending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sendMutation.isPending}
            activeOpacity={0.85}
            testID="contact-support-send-button"
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send color="#fff" size={18} />
            )}
            <Text style={styles.sendBtnText}>
              {sendMutation.isPending ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  content: {
    padding: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: AuthColors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: AuthColors.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: AuthColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  formSection: {},
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AuthColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: AuthColors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: AuthColors.inputText,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
    marginBottom: 16,
  },
  messageInput: {
    minHeight: 120,
    paddingTop: 13,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AuthColors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: AuthColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuthColors.successMuted,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AuthColors.success + '30',
  },
  successText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: AuthColors.success,
    flex: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.25)',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: AuthColors.textDanger,
  },
});
