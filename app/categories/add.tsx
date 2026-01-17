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
import { db, categories } from '@/db';

const CATEGORY_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE',
  '#30B0C7', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
  '#8E8E93', '#636366', '#48484A', '#3A3A3C', '#2C2C2E',
];

type CategoryType = 'income' | 'expense' | 'transfer';

export default function AddCategoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setIsSaving(true);

    try {
      // Determine parent category based on type (for grouping)
      await db.insert(categories).values({
        name: name.trim(),
        icon: 'folder', // Default icon
        color: selectedColor,
        isSystem: false,
      });

      Alert.alert('Success', 'Category created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Failed to create category:', err);
      Alert.alert('Error', 'Failed to create category');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Category' }} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Preview */}
          <View style={styles.previewContainer}>
            <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
              <Text style={styles.previewIconText}>
                {name.trim() ? name.charAt(0).toUpperCase() : 'C'}
              </Text>
            </View>
            <Text style={[styles.previewName, { color: colors.text }]}>
              {name.trim() || 'Category Name'}
            </Text>
          </View>

          {/* Name Input */}
          <Card variant="outlined" style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Category Name
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
              value={name}
              onChangeText={setName}
              placeholder="Enter category name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
          </Card>

          {/* Type Selection */}
          <Card variant="outlined" style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Category Type
            </Text>
            <View style={styles.typeButtons}>
              {(['income', 'expense', 'transfer'] as CategoryType[]).map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor:
                        categoryType === type
                          ? colors.primary
                          : colors.backgroundSecondary,
                      borderColor:
                        categoryType === type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setCategoryType(type)}
                >
                  <Ionicons
                    name={
                      type === 'income'
                        ? 'arrow-down-circle'
                        : type === 'expense'
                        ? 'arrow-up-circle'
                        : 'swap-horizontal-circle'
                    }
                    size={20}
                    color={categoryType === type ? 'white' : colors.text}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: categoryType === type ? 'white' : colors.text },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Color Selection */}
          <Card variant="outlined" style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Color
            </Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                </Pressable>
              ))}
            </View>
          </Card>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <Pressable
            style={[
              styles.saveButton,
              {
                backgroundColor: name.trim() ? colors.primary : colors.border,
              },
            ]}
            onPress={handleSave}
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Create Category</Text>
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
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewIconText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '600',
  },
  previewName: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
