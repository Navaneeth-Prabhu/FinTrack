import { useTheme } from "@/hooks/useTheme";
import { FlatList, Text, View, ViewStyle } from "react-native";
import { ThemedText } from "./common/ThemedText";

interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ variant = 'default', children, style }: CardProps) {
  const { colors, tokens, getShadow } = useTheme();

  const variantStyles = {
      outlined: {
          borderWidth: 1,
          borderColor: colors.border,
      },
      elevated: getShadow(2),
      default: {},
  };

  return (
      <View style={[style, variantStyles[variant], {
          backgroundColor: colors.card,
          padding: tokens.spacing.md,
          borderRadius: tokens.borderRadius.md,
      }]}>
          {children}
      </View>
  );
}

export function ExtraInfo() {
  const { colors } = useTheme();
  const data = [
      { id: '1', title: 'AI Research', description: 'Latest insights on AI and finance.', variant: 'elevated' },
      { id: '2', title: 'Highest Income', description: 'You earned $5,000 this month.', variant: 'default' },
      { id: '3', title: 'Expenses vs Last Month', description: 'Your expenses increased by 10%.', variant: 'outlined' },
  ];

  return (
      <FlatList
          data={data}
          horizontal
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
              <Card variant="outlined" style={{ marginHorizontal: 10, width: 200 }}>
                  <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>{item.title}</ThemedText>
                  <ThemedText style={{color: colors.subtitle}}>{item.description}</ThemedText>
              </Card>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          showsHorizontalScrollIndicator={false}
      />
  );
}
