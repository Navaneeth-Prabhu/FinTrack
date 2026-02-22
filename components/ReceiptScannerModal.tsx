import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReceiptScanner from './ReceiptScanner';

interface ReceiptScannerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onScan: (imageUri: string) => void;
  type?: string;
  category?: string;
}

const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({ isVisible, onClose, onScan, type, category }) => {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <ReceiptScanner
          onImageCaptured={onScan}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default ReceiptScannerModal;