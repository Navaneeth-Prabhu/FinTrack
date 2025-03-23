import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSizes } from '@/constants/theme';

interface BottomSheetModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
    visible,
    onClose,
    title,
    children
}) => {
    const { colors } = useTheme();

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>
                        {title}
                    </Text>

                    {children}

                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <Text style={[styles.normalText, { color: colors.text }]}>Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

export default BottomSheetModal;

const styles = StyleSheet.create({
    settingSection: {
        marginBottom: 30
    },
    sectionHeader: {
        fontSize: fontSizes.FONT23,
        fontFamily: "Poppins_600SemiBold",
        marginBottom: 10
    },
    settingItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15
    },
    normalText: {
        fontSize: fontSizes.FONT19,
        opacity: 0.9,
        fontFamily: "Poppins_500Medium"
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    bottomSheet: {
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: 400
    },
    button: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15
    },
    buttonText: {
        color: '#fff',
        fontSize: fontSizes.FONT18,
        fontFamily: "Poppins_500Medium"
    },
    closeButton: {
        paddingVertical: 15,
        alignItems: 'center'
    },
});