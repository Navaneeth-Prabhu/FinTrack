import { Image, StyleSheet, Platform, View, Text } from 'react-native';

import { FloatingActionButton } from '@/components/layout/FloatingActionButton';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import HomeScreen from '@/screens/home/home.screen';
export default function Home() {
  return (
    <>
      <FloatingActionButton />
      <Screen scroll>
        <HomeScreen />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
