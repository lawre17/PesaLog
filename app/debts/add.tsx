import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { debtService } from '@/services/debt.service';

type DebtDirection = 'owed_to_person' | 'owed_by_person';

export default function AddDebtScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [direction, setDirection] = useState<DebtDirection>('owed_to_person');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert('Error', 'Please enter the person\'s name');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsSaving(true);

    try {
      // Convert amount to cents
      const amountInCents = Math.round(parseFloat(amount) * 100);

      await debtService.createPersonalDebt(
        direction,
        undefined, // No linked transaction
        amountInCents,
        personName.trim(),
        personPhone.trim() || undefined,
        notes.trim() || undefined
      );

      Alert.alert(
        'Success',
        direction === 'owed_to_person'
          ? `Recorded that you owe ${personName} KES ${amount}`
          : `Recorded that ${personName} owes you KES ${amount}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Failed to add debt:', err);
      Alert.alert('Error', 'Failed to save debt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Debt' }} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Direction Selection */}
          <Text style={[styles.label, { color: colors.text }]}>
            Type of Debt
          </Text>
          <View style={styles.directionButtons}>
            <Pressable
              style={[
                styles.directionButton,
                {
                  backgroundColor:
                    direction === 'owed_to_person'
                      ? colors.debt
                      : colors.backgroundSecondary,
                  borderColor:
                    direction === 'owed_to_person' ? colors.debt : colors.border,
                },
              ]}
              onPress={() => setDirection('owed_to_person')}
            >
              <Ionicons
                name="arrow-up-circle"
                size={24}
                color={direction === 'owed_to_person' ? 'white' : colors.text}
              />
              <Text
                style={[
                  styles.directionButtonText,
                  { color: direction === 'owed_to_person' ? 'white' : colors.text },
                ]}
              >
                I Borrowed
              </Text>
              <Text
                style={[
                  styles.directionButtonSubtext,
                  {
                    color:
                      direction === 'owed_to_person'
                        ? 'rgba(255,255,255,0.8)'
                        : colors.textSecondary,
                  },
                ]}
              >
                Money I owe someone
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.directionButton,
                {
                  backgroundColor:
                    direction === 'owed_by_person'
                      ? colors.income
                      : colors.backgroundSecondary,
                  borderColor:
                    direction === 'owed_by_person' ? colors.income : colors.border,
                },
              ]}
              onPress={() => setDirection('owed_by_person')}
            >
              <Ionicons
                name="arrow-down-circle"
                size={24}
                color={direction === 'owed_by_person' ? 'white' : colors.text}
              />
              <Text
                style={[
                  styles.directionButtonText,
                  { color: direction === 'owed_by_person' ? 'white' : colors.text },
                ]}
              >
                I Lent
              </Text>
              <Text
                style={[
                  styles.directionButtonSubtext,
                  {
                    color:
                      direction === 'owed_by_person'
                        ? 'rgba(255,255,255,0.8)'
                        : colors.textSecondary,
                  },
                ]}
              >
                Money owed to me
              </Text>
            </Pressable>
          </View>

          {/* Person Details */}
          <Card variant="outlined" style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {direction === 'owed_to_person' ? 'Who do you owe?' : 'Who owes you?'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={personName}
                onChangeText={setPersonName}
                placeholder="Enter name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Phone Number (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={personPhone}
                onChangeText={setPersonPhone}
                placeholder="07XX XXX XXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </Card>

          {/* Amount */}
          <Card variant="outlined" style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Amount
            </Text>

            <View style={styles.amountInputContainer}>
              <Text style={[styles.currencyLabel, { color: colors.text }]}>
                KES
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </Card>

          {/* Notes */}
          <Card variant="outlined" style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Notes (optional)
            </Text>

            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="What was this for?"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Card>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <Pressable
            style={[
              styles.saveButton,
              {
                backgroundColor:
                  personName.trim() && amount
                    ? direction === 'owed_to_person'
                      ? colors.debt
                      : colors.income
                    : colors.border,
              },
            ]}
            onPress={handleSave}
            disabled={!personName.trim() || !amount || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons
                  name={direction === 'owed_to_person' ? 'arrow-up' : 'arrow-down'}
                  size={20}
                  color="white"
                />
                <Text style={styles.saveButtonText}>
                  {direction === 'owed_to_person'
                    ? 'Record Borrowed Money'
                    : 'Record Money Lent'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  directionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  directionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  directionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  directionButtonSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '600',
  },
  notesInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
