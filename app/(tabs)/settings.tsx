import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import SettingsScreen from '@/screens/settings/settings.screen'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const settings = () => {
  return (
    <ErrorBoundary>
      <SettingsScreen />
    </ErrorBoundary>
  )
}

export default settings

const styles = StyleSheet.create({})