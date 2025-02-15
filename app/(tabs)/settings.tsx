// // File: src/screens/SettingsScreen.tsx
// import React from 'react';
// import { View, Text, StyleSheet, Switch, useColorScheme, TouchableOpacity } from 'react-native';
// import { useThemeStore } from '@/src/store/themeStore';

// export const SettingsScreen = () => {
//   const { themeMode, setThemeMode, getCurrentTheme } = useThemeStore();
//   const currentTheme = getCurrentTheme();
//   const isDark = currentTheme === 'dark';

//   // Dynamic styles based on theme
//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       padding: 16,
//       backgroundColor: isDark ? '#121212' : '#f5f5f5',
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: 'bold',
//       marginBottom: 16,
//       color: isDark ? '#ffffff' : '#000000',
//     },
//     row: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingVertical: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: isDark ? '#333333' : '#e0e0e0',
//     },
//     optionText: {
//       fontSize: 16,
//       color: isDark ? '#e0e0e0' : '#333333',
//     },
//     selectedOptionText: {
//       fontSize: 16,
//       color: '#2196f3',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       <Text style={styles.sectionTitle}>App Settings</Text>

//       <View style={styles.row}>
//         <Text style={styles.optionText}>Dark Mode</Text>
//         <Switch
//           value={isDark}
//           onValueChange={(value) => setThemeMode(value ? 'dark' : 'light')}
//         />
//       </View>

//       <Text style={styles.sectionTitle}>Theme Options</Text>

//       <TouchableOpacity 
//         style={styles.row} 
//         onPress={() => setThemeMode('system')}
//       >
//         <Text style={styles.optionText}>Use System Theme</Text>
//         {themeMode === 'system' && (
//           <Text style={styles.selectedOptionText}>✓</Text>
//         )}
//       </TouchableOpacity>

//       <TouchableOpacity 
//         style={styles.row} 
//         onPress={() => setThemeMode('light')}
//       >
//         <Text style={styles.optionText}>Light Theme</Text>
//         {themeMode === 'light' && (
//           <Text style={styles.selectedOptionText}>✓</Text>
//         )}
//       </TouchableOpacity>

//       <TouchableOpacity 
//         style={styles.row} 
//         onPress={() => setThemeMode('dark')}
//       >
//         <Text style={styles.optionText}>Dark Theme</Text>
//         {themeMode === 'dark' && (
//           <Text style={styles.selectedOptionText}>✓</Text>
//         )}
//       </TouchableOpacity>
//     </View>
//   );
// };
import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import SettingsScreen from '@/screens/settings/settings.screen'

const settings = () => {
  return (
    <SettingsScreen />
  )
}

export default settings

const styles = StyleSheet.create({})