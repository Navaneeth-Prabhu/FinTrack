import React, { useEffect, useState } from 'react';
import { View, Switch, StyleSheet, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemedText } from '@/components/common/ThemedText';
import usePreferenceStore from '@/stores/preferenceStore';

export default function BiometricToggle({ isDarkMode, themeColor, darkThemeColor, colors }) {
    const {biometrics, setBiometrics} = usePreferenceStore();
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    // Check device compatibility and enrollment on mount
    useEffect(() => {
        (async () => {
            // Check if the device supports biometric hardware
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (!hasHardware) {
                setIsBiometricSupported(false);
                return;
            }

            // Check if biometric data is enrolled (fingerprint or face)
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricSupported(isEnrolled);

            if (!isEnrolled) {
                console.log('No biometric data enrolled on this device.');
            }
        })();
    }, []);

    // Handle switch toggle
    const handleBiometricToggle = async (value) => {
        console.log('valueeeeeeee', value)
        if (!isBiometricSupported) {
            Alert.alert(
                'Biometric Unavailable',
                'This device does not support biometric authentication or no biometric data is enrolled.'
            );
            return;
        }

        if (value) {
            // If turning on, prompt for biometric authentication
            try {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Enable Biometric Login',
                    cancelLabel: 'Cancel',
                    disableDeviceFallback: false,
                });

                if (result.success) {
                    setBiometrics(true);
                    console.log('Biometric login enabled');
                } else {
                    Alert.alert('Authentication Failed', 'Biometric authentication was not successful.');
                }
            } catch (error) {
                console.log('Error during authentication:', error);
                Alert.alert('Error', 'An error occurred during authentication.');
            }
        } else {
            // If turning off, simply disable it (no authentication required to disable)
            setBiometrics(false);
            console.log('Biometric login disabled');
        }
    };

    return (
        <View style={styles.toggleItem}>
            <View style={styles.toggleItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                    <MaterialCommunityIcons
                        name="fingerprint"
                        size={20}
                        color={isDarkMode ? darkThemeColor : themeColor}
                    />
                </View>
                <ThemedText style={styles.toggleText}>Biometric Login</ThemedText>
            </View>
            <Switch
                value={biometrics}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#D1D1D6', true: themeColor }}
                thumbColor="#FFFFFF"
                disabled={!isBiometricSupported} // Disable switch if biometric isn't supported
            />
        </View>
    );
}

const styles = StyleSheet.create({
    toggleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    toggleItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    toggleText: {
        fontSize: 16,
    },
});