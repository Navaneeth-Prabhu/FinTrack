// components/layout/Header.tsx
import { useRouter } from 'expo-router';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '../common/ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  transparent?: boolean;
}

export function Header({
  title,
  showBack = true,
  rightAction,
  leftAction,
  transparent = false,
}: HeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        !transparent && {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.left}>
        {showBack && !leftAction && (
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        )}
        {leftAction}
      </View>

      <ThemedText variant="h3" style={styles.title}>
        {title}
      </ThemedText>

      <View style={styles.right}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingHorizontal: 16,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
});