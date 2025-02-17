import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { ThemedText } from '../common/ThemedText'

const ListSummary = () => {
    return (
        <View style={{
            height: 200, 
            // backgroundColor: 'black',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <ThemedText variant='h3'>net total this week</ThemedText>
            <ThemedText variant='h1'>$1981.00</ThemedText>
        </View>
    )
}

export default ListSummary

const styles = StyleSheet.create({})