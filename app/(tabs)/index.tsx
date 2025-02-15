import { Image, StyleSheet, Platform, View, Text } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/common/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TabLayout from './_layout';
import { FloatingActionButton } from '@/components/layout/FloatingActionButton';
import { useTransactionStore } from '@/stores/transactionStore';
import { useEffect } from 'react';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';

export default function HomeScreen() {
  const { transactions, fetchTransactions } = useTransactionStore();

  console.log(transactions);
  return (
    <>
      <FloatingActionButton />
      <Screen scroll>
        <></>
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
