import React, { useState } from 'react';
import { Modal, StyleSheet, View, SafeAreaView } from 'react-native';
import ReceiptScanner from './ReceiptScanner';

const ReceiptScannerModal = ({ isVisible, onClose, onScan, type, category }) => {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <ReceiptScanner
          onClose={onClose}
          onScan={onScan}
          type={type}
          category={category}
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