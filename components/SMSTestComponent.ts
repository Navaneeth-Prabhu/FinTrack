// SMSTestComponent.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { debugReadSMS, debugReadFinancialSMS } from '@/services/SMSDebugService';

const SMSTestComponent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState('');

  const handleTestAllSMS = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      await debugReadSMS();
      setTestResult('Check console logs for SMS results');
    } catch (error) {
      setTestResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestFinancialSMS = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      await debugReadFinancialSMS();
      setTestResult('Check console logs for financial SMS results');
    } catch (error) {
      setTestResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Debug Tools</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleTestAllSMS}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Test Read All SMS</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleTestFinancialSMS}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Test Read Financial SMS</Text>
      </TouchableOpacity>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0066cc" />
          <Text style={styles.loadingText}>Reading SMS...</Text>
        </View>
      )}
      
      {testResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#495057',
  },
  resultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
  },
  resultText: {
    color: '#212529',
  },
});

export default SMSTestComponent;