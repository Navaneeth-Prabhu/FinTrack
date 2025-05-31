import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface Message {
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

const initialMessages: Message[] = [
  { text: 'Hello! How can I assist you today?', sender: 'ai', timestamp: Date.now() - 10000 },
  { text: 'Show me a chart of my expenses.', sender: 'user', timestamp: Date.now() - 9000 },
  { text: 'Here is your expense chart for this month.', sender: 'ai', timestamp: Date.now() - 8000 },
];

const ChartScreen = () => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (inputText.trim() === '') return;
    const newMsg: Message = { text: inputText, sender: 'user', timestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          text: 'This is a sample AI response. (You can integrate your AI logic here.)',
          sender: 'ai',
          timestamp: Date.now(),
        },
      ]);
      setIsTyping(false);
    }, 1200);
    Keyboard.dismiss();
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.avatarAI}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}> 
          <Text style={[styles.messageText, { color: isUser ? '#fff' : colors.text }]}>{item.text}</Text>
        </View>
        {isUser && (
          <View style={styles.avatarUser}>
            <Ionicons name="person-circle" size={32} color={colors.primary} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI Chat</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, idx) => idx.toString()}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        {isTyping && (
          <View style={styles.typingRow}>
            <View style={styles.avatarAI}>
              <Text style={styles.avatarText}>🤖</Text>
            </View>
            <View style={styles.bubble}>
              <Text style={styles.typingText}>AI is typing...</Text>
            </View>
          </View>
        )}
        <View style={{padding: 16}}>

        <View style={[styles.inputBar, { borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.subtitle}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Feather name="send" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    maxWidth: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  avatarAI: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ececec',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
    minWidth: 40,
  },
  aiBubble: {
    backgroundColor: '#f3f3f3',
    marginRight: 'auto',
  },
  userBubble: {
    backgroundColor: '#6C47FF',
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 8,
  },
  typingText: {
    fontSize: 15,
    color: '#888',
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: 'transparent',
    paddingBottom: 14,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default ChartScreen;
