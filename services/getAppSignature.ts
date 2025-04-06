import { Platform } from 'react-native';
import SMSRetriever from 'react-native-sms-retriever';

export const getAppSignature = async () => {
  if (Platform.OS !== 'android') return;
  
  try {
    const signature = await SMSRetriever.getAppSignature();
    console.log('App Signature:', signature);
    return signature;
  } catch (error) {
    console.error('Error getting app signature:', error);
  }
};

// Call this when your app starts
// Then add the hash to all your test SMS messages