import React, { useState, useEffect } from 'react';
import { View, Button, Image, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ScanLine } from 'lucide-react-native';

const ReceiptScanner = ({ onImageCaptured }: { onImageCaptured: (imageUri: string) => void }) => {
    const { colors } = useTheme();

    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            setHasCameraPermission(status === 'granted');
        })();
    }, []);

    const takePicture = async () => {
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setReceiptImage(result.assets[0].uri);
            onImageCaptured(result.assets[0].uri);
        }
    };

    if (hasCameraPermission === false) {
        return <View><Text>No access to camera</Text></View>;
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={takePicture} style={[styles.qrButton, { backgroundColor: colors.card }]}>
                {/* <Ionicons name="camera" size={24} color={colors.text} /> */}
                <ScanLine color={colors.text}/>
            </TouchableOpacity>
            {/* {receiptImage && <Image source={{ uri: receiptImage }} style={{ width: 200, height: 200 }} />} */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrButton: {
        padding: 10,
        borderRadius: 10,
    },
});

export default ReceiptScanner;