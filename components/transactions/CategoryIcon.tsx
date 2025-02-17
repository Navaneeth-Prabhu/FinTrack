import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { Category } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface CategoryIconProps {
  category: Category;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.colorOverlay, { backgroundColor: category.color }]} />
      <ThemedText style={styles.icon}>{category.icon}</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  colorOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    opacity: 0.7,
  },
  icon: {
    fontSize: 18,
  },
});