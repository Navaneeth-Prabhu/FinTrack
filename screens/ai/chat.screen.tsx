import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { fontSizes } from '@/constants/theme';

interface Message {
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

interface SuggestionChip {
  id: string;
  text: string;
  description?: string;
}

const ChatScreen = () => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const suggestionChips: SuggestionChip[] = [
    { id: '1', text: 'Tell me what you can do' },
    { id: '2', text: 'Help me plan' },
    { id: '3', text: 'Research a topic' },
    { id: '4', text: 'Help me write' },
  ];

  const initialExamples = [
    "Talk things out live: Say \"Let's go Live\" or tap the Live icon in the Gemini app to have a back and forth conversation. Ask questions, set reminders, or even brainstorm ideas with me.",
    "Write emails: Ask me to write or re-write emails and even change the tone based on who will read it.",
    "Refine work: Request feedback, talk through different perspectives, and get help with research and outlines.",
    "Streamline tasks: Go from multiple tabs to one conversation by asking me to find information"
  ];

  useEffect(() => {
    // Add initial welcome message
    if (!showWelcomeScreen && messages.length === 0) {
      setTimeout(() => {
        const aiMessage = {
          text: "I can do lots of things! I'm good at brainstorming ideas, clarifying tricky concepts, and tasks like recapping meetings and helping you research a topic.\n\nNot sure where to begin? Here's how I can help:\n\nGet more done",
          sender: 'ai',
          timestamp: Date.now()
        };

        setMessages([aiMessage]);
      }, 500);
    }
  }, [showWelcomeScreen]);

  // Scroll to bottom when new messages appear
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = (text: string = inputText) => {
    if (text.trim() !== '') {
      const newUserMessage = { text, sender: 'user', timestamp: Date.now() };
      setMessages(prev => [...prev, newUserMessage]);
      setInputText('');
      setIsTyping(true);

      // Simulate AI response
      setTimeout(() => {
        let aiResponse: string;

        if (text.toLowerCase().includes('what you can do') || text.toLowerCase().includes('example')) {
          aiResponse = "I can do lots of things! I'm good at brainstorming ideas, clarifying tricky concepts, and tasks like recapping meetings and helping you research a topic.\n\nNot sure where to begin? Here's how I can help:\n\nGet more done";
        } else if (text.toLowerCase().includes('help me plan')) {
          aiResponse = "I'd be happy to help you plan! What specifically are you looking to plan? A trip, event, project, or something else?";
        } else if (text.toLowerCase().includes('research')) {
          aiResponse = "I can help research a topic by providing information, organizing key points, and helping you explore different perspectives. What topic would you like to research?";
        } else if (text.toLowerCase().includes('write')) {
          aiResponse = "I can help with writing tasks like drafting emails, creating content, or editing existing text. What would you like me to help you write?";
        } else {
          const responses = [
            "I'm here to assist you. Could you provide more details about what you're looking for?",
            "I'd be happy to help with that. What specific aspects are you interested in?",
            "I can help with this request. What additional information can you share to help me give you the best response?",
            "I'm designed to assist with a variety of tasks. Could you elaborate on what you need help with?",
          ];
          aiResponse = responses[Math.floor(Math.random() * responses.length)];
        }

        setMessages(prev => [...prev, { text: aiResponse, sender: 'ai', timestamp: Date.now() }]);
        setIsTyping(false);
      }, 1500);

      Keyboard.dismiss();
    }
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.aiIconContainer}>
          <LinearGradient
            colors={['#4285F4', '#34A853', '#FBBC05', '#EA4335']}
            style={styles.geminiIconGradient}
          >
            <Text style={styles.geminiIconText}>✧</Text>
          </LinearGradient>
        </View>
        <View style={styles.typingBubble}>
          <View style={styles.typingDotsContainer}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      </View>
    );
  };

  const WelcomeScreen = () => {
    return (
      <View style={[styles.welcomeContainer, { backgroundColor: colors.background }]}>
        <View style={styles.welcomeTitleContainer}>

          <ThemedText style={styles.welcomeTitle}>
            <ThemedText style={styles.blueText}>Hello</ThemedText>
            <ThemedText style={styles.purpleText}>, </ThemedText>
            <ThemedText style={styles.pinkText}>there</ThemedText>
          </ThemedText>
        </View>

        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestionChips}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionChip}
                onPress={() => {
                  setShowWelcomeScreen(false);
                  setTimeout(() => sendMessage(item.text), 300);
                }}
              >
                <Text style={styles.suggestionChipText}>{item.text}</Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <View style={[styles.welcomeInputContainer, { borderColor: colors.border }]}>
          <TouchableOpacity style={styles.welcomeInputButton}>
            <Feather name="plus" size={22} color="#AAAAAA" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.welcomeInputField}
            onPress={() => setShowWelcomeScreen(false)}
          >
            <Text style={styles.welcomeInputPlaceholder}>Ask Gemini</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.welcomeInputButton}>
            <Feather name="mic" size={22} color="#AAAAAA" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    // Check if this AI message is the first one (with examples)
    const showExamples = item.sender === 'ai' &&
      item.text.includes("Get more done") &&
      messages.findIndex(m => m.text.includes("Get more done")) === index;

    return (
      <View style={styles.messageItemContainer}>
        <View style={[
          styles.messageWrapper,
          item.sender === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper,
        ]}>
          {item.sender === 'ai' && (
            <View style={styles.aiIconContainer}>
              <LinearGradient
                colors={['#4285F4', '#34A853', '#FBBC05', '#EA4335']}
                style={styles.geminiIconGradient}
              >
                <Text style={styles.geminiIconText}>✧</Text>
              </LinearGradient>
            </View>
          )}

          <View style={[
            styles.messageBubble,
            item.sender === 'user' ? styles.userMessage : styles.aiMessage,
            { backgroundColor: item.sender === 'user' ? colors.card : colors.background }
          ]}>
            <ThemedText style={{ fontSize: fontSizes.FONT18 }}>
              {item.text}
            </ThemedText>
          </View>
        </View>

        {showExamples && (
          <View style={styles.examplesContainer}>
            {initialExamples.map((example, i) => (
              <View key={i} style={styles.exampleItem}>
                <ThemedText style={{ fontSize: fontSizes.FONT18 }}>•</ThemedText>
                <ThemedText style={{ fontSize: fontSizes.FONT18 }}>{example}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (showWelcomeScreen) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle='dark-content' backgroundColor={colors.background} />
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity>
              <MaterialIcons name="chat" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText variant='subtitle' style={styles.headerText}>Gemini</ThemedText>
            <View style={styles.modelBadge}>
              <Text style={styles.modelBadgeText}>2.0 Flash</Text>
            </View>
            <View style={styles.headerSpacer} />
            <TouchableOpacity style={styles.profileButton}>
              <View style={styles.profileImage} />
            </TouchableOpacity>
          </View>
        </View>
        <WelcomeScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setShowWelcomeScreen(true)}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText variant='subtitle' style={styles.headerTitle}>
              {messages.length > 0 && messages[0].sender === 'user'
                ? messages[0].text.length > 30
                  ? messages[0].text.substring(0, 30) + '...'
                  : messages[0].text
                : 'Chat'}
            </ThemedText>
            <View style={styles.modelBadge}>
              <ThemedText style={styles.modelBadgeText}>2.0 Flash</ThemedText>
            </View>
            <View style={styles.headerSpacer} />
            <TouchableOpacity style={styles.profileButton}>
              <View style={styles.profileImage} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          renderItem={renderMessageItem}
          keyExtractor={(item, index) => index.toString()}
        />

        {renderTypingIndicator()}
        <View style={styles.footerContainer}>
          {messages.length === 0 && (
            <View style={styles.suggestionChipsContainer}>
              {suggestionChips.map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(chip.text)}
                >
                  <Text style={styles.suggestionChipText}>{chip.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}



          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputButton}>
              <Feather name="plus" size={22} color="#AAAAAA" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={text => setInputText(text)}
              placeholder="Ask Gemini"
              placeholderTextColor="#AAAAAA"
              multiline
            />

            <TouchableOpacity style={styles.inputButton}>
              <Feather name="mic" size={22} color="#AAAAAA" />
            </TouchableOpacity>

            {inputText.trim() !== '' ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => sendMessage()}
              >
                <Feather name="send" size={22} color="#8AB4F8" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.inputButton}>
                <MaterialIcons name="line-weight" size={22} color="#AAAAAA" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Gemini can make mistakes, so double-check it
            </Text>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 20,
    flex: 1,
  },
  headerText: {
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  modelBadge: {
    backgroundColor: '#333333',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginLeft: 12,
  },
  modelBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 16,
  },
  messageItemContainer: {
    marginBottom: 16,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageWrapper: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-start',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  aiMessageWrapper: {
    justifyContent: 'flex-start',
  },
  aiIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    marginTop: 4,
  },
  geminiIconGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8AB4F8',
  },
  geminiIconText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  messageBubble: {
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderTopEndRadius: 2,
    paddingHorizontal: 18,
    paddingVertical: 12,

  },
  aiMessage: {
    borderWidth: 0,
    borderColor: '#444444',
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: '100%',

  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  examplesContainer: {
    marginTop: 16,
    marginLeft: 36,
  },
  exampleItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typingContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  typingDotsContainer: {
    flexDirection: 'row',
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    height: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#AAAAAA',
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.3,
    transform: [{ translateY: 0 }],
  },
  typingDot2: {
    opacity: 0.5,
    transform: [{ translateY: -4 }],
  },
  typingDot3: {
    opacity: 0.7,
    transform: [{ translateY: 0 }],
  },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  suggestionChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  suggestionChip: {
    backgroundColor: '#202020',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
  },
  suggestionChipText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  disclaimer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  disclaimerText: {
    color: '#888888',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  inputButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    paddingHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 48,
  },
  blueText: {
    color: '#8AB4F8',
  },
  purpleText: {
    color: '#AD8BF5',
  },
  pinkText: {
    color: '#F28B82',
  },
  suggestionsContainer: {
    width: '100%',
    marginBottom: 8,
  },
  welcomeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 4,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  welcomeInputField: {
    flex: 1,
    paddingVertical: 8,
  },
  welcomeInputPlaceholder: {
    color: '#AAAAAA',
    fontSize: 16,
  },
});