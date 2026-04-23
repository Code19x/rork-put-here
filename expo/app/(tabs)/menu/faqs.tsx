// PutHere App - FAQs Screen v1.1
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { ChevronDown, HelpCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'What is PutHere?',
    answer: 'PutHere is a personal inventory app that helps you keep track of all your belongings. You can log items with photos, categories, locations, and notes so you always know where your stuff is.',
  },
  {
    id: '2',
    question: 'How do I add a new item?',
    answer: 'Tap the orange "+" button on the home screen. You can add a name, take a photo or choose from your gallery, select a category and location, and add notes.',
  },
  {
    id: '3',
    question: 'Can I create custom categories?',
    answer: 'Yes! Go to the Categories tab and tap "Add Category" at the bottom. You can choose a name, icon, and color for your custom category.',
  },
  {
    id: '4',
    question: 'How do I search for items?',
    answer: 'Use the search bar at the top of the home screen. You can also tap the filter button to narrow results by category or location.',
  },
  {
    id: '5',
    question: 'Is my data stored securely?',
    answer: 'All your data is stored locally on your device. We don\'t upload any of your information to external servers. Your inventory remains private and accessible only to you.',
  },
  {
    id: '6',
    question: 'Can I sort my items?',
    answer: 'Yes! On the home screen, you can sort items by date added (newest or oldest first) or alphabetically (A-Z or Z-A) using the sort button next to the filter.',
  },
  {
    id: '7',
    question: 'How do I edit or delete an item?',
    answer: 'Tap on any item to see its details. From there, you can tap "Edit Item" to make changes or the trash icon to delete it.',
  },
  {
    id: '8',
    question: 'Do I need an account to use the app?',
    answer: 'Yes, an account is required to use PutHere. You can sign up with your email, or use Apple or Google sign-in for quick access. This helps keep your data secure and prepares for future cloud sync features.',
  },
  {
    id: '9',
    question: 'Can I use voice input to add items?',
    answer: 'Yes! When adding or editing an item, tap the microphone icon next to the Name or Notes fields. Speak clearly and the app will transcribe your voice into text automatically.',
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [expanded, setExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    Animated.timing(animValue, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setExpanded(prev => !prev);
  }, [expanded, animValue]);

  const rotateZ = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.faqCard}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Animated.View style={{ transform: [{ rotateZ }] }}>
          <ChevronDown color={Colors.primary} size={20} />
        </Animated.View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.faqBody}>
          <Text style={styles.faqAnswer}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function FAQsScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <HelpCircle color={Colors.sage} size={32} />
        </View>
        <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
        <Text style={styles.heroSubtitle}>
          Find answers to common questions about PutHere
        </Text>
      </View>

      <View style={styles.faqList}>
        {FAQ_DATA.map(faq => (
          <FAQAccordion key={faq.id} item={faq} />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Still have questions? Visit our Contact Us page.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Colors.sageLight + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
