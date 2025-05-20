import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { Category } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { categoryIcons } from '@/constants/categories';

interface CategoryIconProps {
  category: Category;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category }) => {
  const { colors } = useTheme();
  const IconComponent = categoryIcons.lucide.find(i => i.name === category.icon)?.component;

  return (
    <View style={[styles.container, {
      // backgroundColor: category.color,
      borderColor: category.color
    }]}>
      <View style={[styles.colorOverlay, { backgroundColor: category.color }]} />
      {IconComponent !== undefined ? (
        <IconComponent size={24} strokeWidth={1.5} color={colors.text} />
      ) : (
        <ThemedText style={styles.icon}>{category.icon}</ThemedText>
      )}
      {/* <View style={[styles.colorOverlay, { backgroundColor: category.color }]} /> */}
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
    borderWidth: 2,
  },
  colorOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    opacity: 0.1,
  },
  icon: {
    fontSize: 18,
  },
});