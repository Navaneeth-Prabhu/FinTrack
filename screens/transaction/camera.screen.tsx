
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Button, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { createWorker } from 'tesseract.js';
import { nanoid } from 'nanoid/non-secure';
import { useTransactionStore } from '@/stores/transactionStore';


const CameraScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [extractedAmount, setExtractedAmount] = useState(null);
  const cameraRef = useRef(null);
  const { saveTransaction } = useTransactionStore();
  
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        
        // Resize and optimize the image for OCR
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        setCapturedImage(manipulatedImage.uri);
        await performOCR(manipulatedImage.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };
  
  const performOCR = async (imageUri) => {
    setScanning(true);
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imageUri);
      await worker.terminate();
      
      // Extract numeric values that might be amounts
      const amountRegex = /\$?\s*\d+(?:[,.]\d{1,2})?/g;
      const possibleAmounts = text.match(amountRegex);
      
      if (possibleAmounts && possibleAmounts.length > 0) {
        // Clean and parse the first found amount
        const cleanedAmount = possibleAmounts[0].replace(/[$,\s]/g, '');
        const amount = parseFloat(cleanedAmount);
        
        if (!isNaN(amount)) {
          setExtractedAmount(amount);
        }
      }
      
      console.log("OCR Extracted Text:", text);
      setScanning(false);
    } catch (error) {
      console.error('OCR Error:', error);
      setScanning(false);
    }
  };
  
  const saveExpense = () => {
    if (extractedAmount) {
      const transaction: Transaction = {
        id: nanoid(),
        amount: extractedAmount,
        type: 'expense',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        category: { id: 'misc', name: 'Miscellaneous' }, // Default category
        source: {
          type: 'ocr',
          rawData: capturedImage,
        },
        mode: 'cash', // Default payment mode
        attachments: capturedImage ? {
          type: 'image',
          url: capturedImage,
        } : undefined,
      };
      
      saveTransaction(transaction);
      navigation.goBack();
    }
  };
  
  const retakePhoto = () => {
    setCapturedImage(null);
    setExtractedAmount(null);
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      {!capturedImage ? (
        <Camera style={styles.camera} type={type} ref={cameraRef}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <Text style={styles.captureText}>Capture</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.preview} />
          
          {scanning ? (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.scanningText}>Processing image...</Text>
            </View>
          ) : (
            <View style={styles.resultContainer}>
              {extractedAmount !== null ? (
                <>
                  <Text style={styles.amountText}>
                    Detected Amount: ${extractedAmount.toFixed(2)}
                  </Text>
                  <View style={styles.actionButtonsContainer}>
                    <Button title="Save Expense" onPress={saveExpense} />
                    <Button title="Retake Photo" onPress={retakePhoto} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.errorText}>
                    Could not detect an amount. Please retake the photo.
                  </Text>
                  <Button title="Retake Photo" onPress={retakePhoto} />
                </>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    margin: 20,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  captureButton: {
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 15,
    paddingHorizontal: 30,
    alignSelf: 'center',
    margin: 20,
  },
  captureText: {
    fontSize: 18,
    color: 'black',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: '70%',
  },
  scanningContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  scanningText: {
    marginTop: 10,
    fontSize: 16,
  },
  resultContainer: {
    margin: 20,
    alignItems: 'center',
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
});

export default CameraScreen;