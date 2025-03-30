// src/components/FloatingActionButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../common/ThemedText';
import { useTheme } from '@/hooks/useTheme';

type FloatingActionButtonProps = {
  onPress?: () => void;
};

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = () => {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={() => router.push('/(routes)/transaction/transactionForm')}
    >
      <Text style={styles.buttonText}>+</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // elevation: 5,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.25,
    // shadowRadius: 3.84,
    zIndex: 1000,
  },
  buttonText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
});