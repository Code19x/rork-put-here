// PutHere App - Contact Screen v1.1
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { Mail, Send, CheckCircle, User, AtSign, FileText, MessageSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/providers/AuthProvider';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactScreen() {
  const { user } = useAuth();
  const prefilledName = user?.name && user.name !== 'User' ? user.name : '';
  const prefilledEmail = user?.email ?? '';
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (prefilledEmail && !email) {
      setEmail(prefilledEmail);
    }
    if (prefilledName && !name) {
      setName(prefilledName);
    }
  }, [prefilledEmail, prefilledName, email, name]);

  const [sent, setSent] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Mail color={Colors.primary} size={32} />
          </View>
          <Text style={styles.heroTitle}>Get in Touch</Text>
          <Text style={styles.heroSubtitle}>
            Have a question, suggestion, or found a bug? We'd love to hear from you.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Send us a message</Text>

          <Text style={styles.label}>NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={(t) => { setName(t); setErrorMsg(''); }}
            autoCapitalize="words"
            testID="contact-name-input"
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email address"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            testID="contact-email-input"
          />

          <Text style={styles.label}>SUBJECT</Text>
          <TextInput
            style={styles.input}
            placeholder="What's this about?"
            placeholderTextColor={Colors.textMuted}
            value={subject}
            onChangeText={(t) => { setSubject(t); setErrorMsg(''); }}
            testID="contact-subject-input"
          />

          <Text style={styles.label}>MESSAGE</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Tell us more..."
            placeholderTextColor={Colors.textMuted}
            value={message}
            onChangeText={(t) => { setMessage(t); setErrorMsg(''); }}
            multiline
            textAlignVertical="top"
            testID="contact-message-input"
          />

          {errorMsg !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {sent && (
            <View style={styles.successBanner}>
              <CheckCircle color="#2e7d32" size={20} />
              <Text style={styles.successText}>Your message has been sent successfully.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.sendBtn,
              sendMutation.isPending && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={sendMutation.isPending}
            testID="send-contact-btn"
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color={Colors.textInverse} size="small" />
            ) : (
              <Send color={Colors.textInverse} size={18} />
            )}
            <Text style={styles.sendBtnText}>{sendMutation.isPending ? 'Sending...' : 'Send Message'}</Text>
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
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + '25',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  formSection: {},
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  successText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#2e7d32',
    flex: 1,
  },
  errorBanner: {
    backgroundColor: '#fdecea',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#c62828',
  },
});
