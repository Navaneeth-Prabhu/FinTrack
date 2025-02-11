// components/layout/Screen.tsx
import { useTheme } from '@/hooks/useTheme';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  paddingHorizontal?: number;
  style?: ViewStyle;
}

export function Screen({
  children,
  scroll = true,
  paddingHorizontal = 16,
  style,
}: ScreenProps) {
  const { colors } = useTheme();

  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Container
        style={[
          styles.container,
          { paddingHorizontal },
          style,
        ]}
        showsVerticalScrollIndicator={false}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});