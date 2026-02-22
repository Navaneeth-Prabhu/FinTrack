import React from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const SplashScreen: React.FC = () => {
  const { width } = useWindowDimensions();

  return (
    <LinearGradient
      colors={["#8364e8", "#d397fa"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar translucent backgroundColor="transparent" style="light" />
      <View style={[styles.logoContainer, {
        width: width * 0.5,
        height: width * 0.5,
        borderRadius: width * 0.25
      }]}>
        <Image
          source={require('../assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});

export default SplashScreen;
