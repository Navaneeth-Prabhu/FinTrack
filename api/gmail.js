import { google } from 'googleapis';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Gmail API configuration
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your client ID
const CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET'; // Replace with your client secret

// Create OAuth2 client
const createOAuth2Client = async (tokens) => {
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://auth.expo.io/@yourusername/your-app-slug' // Replace with your Expo redirect URI
  );

  if (tokens) {
    oAuth2Client.setCredentials(tokens);
  }

  return oAuth2Client;
};

// Get Gmail messages
export const getGmailMessages = async (query = 'from:(bank OR credit OR transaction OR payment) after:2023/01/01', maxResults = 100) => {
  try {
    // Get stored tokens
    const tokensString = await AsyncStorage.getItem('gmail_tokens');
    if (!tokensString) {
      throw new Error('No authentication tokens found');
    }
    
    const tokens = JSON.parse(tokensString);
    const auth = await createOAuth2Client(tokens);
    
    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth });
    
    // List messages matching query
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults
    });
    
    if (!response.data.messages || response.data.messages.length === 0) {
      return [];
    }
    
    // Fetch full message details for each message ID
    const messages = await Promise.all(
      response.data.messages.map(async (message) => {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        return fullMessage.data;
      })
    );
    
    return messages;
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    throw error;
  }
};

// Extract email content from a Gmail message
export const extractEmailContent = (message) => {
  try {
    // Get headers
    const headers = message.payload.headers;
    const subject = headers.find(header => header.name === 'Subject')?.value || '';
    const from = headers.find(header => header.name === 'From')?.value || '';
    const date = headers.find(header => header.name === 'Date')?.value || '';
    
    // Get body content
    let body = '';
    
    // Function to extract text from parts recursively
    const extractTextFromParts = (parts) => {
      if (!parts) return '';
      
      let textContent = '';
      
      parts.forEach(part => {
        if (part.mimeType === 'text/plain' && part.body.data) {
          // Decode base64 content
          const buff = Buffer.from(part.body.data, 'base64');
          textContent += buff.toString();
        } else if (part.parts) {
          // Recursively process nested parts
          textContent += extractTextFromParts(part.parts);
        }
      });
      
      return textContent;
    };
    
    // Check if the message has parts
    if (message.payload.parts) {
      body = extractTextFromParts(message.payload.parts);
    } else if (message.payload.body && message.payload.body.data) {
      // If no parts, try to get data directly from body
      const buff = Buffer.from(message.payload.body.data, 'base64');
      body = buff.toString();
    }
    
    return {
      id: message.id,
      threadId: message.threadId,
      subject,
      from,
      date: new Date(date),
      body,
      snippet: message.snippet
    };
  } catch (error) {
    console.error('Error extracting email content:', error);
    return {
      id: message.id,
      error: 'Failed to extract content',
      snippet: message.snippet || ''
    };
  }
};

// Refresh tokens if they've expired
export const refreshTokens = async () => {
  try {
    const tokensString = await AsyncStorage.getItem('gmail_tokens');
    if (!tokensString) {
      throw new Error('No tokens to refresh');
    }
    
    const tokens = JSON.parse(tokensString);
    const auth = await createOAuth2Client(tokens);
    
    const { credentials } = await auth.refreshAccessToken();
    await AsyncStorage.setItem('gmail_tokens', JSON.stringify(credentials));
    
    return credentials;
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    // If refresh fails, clear tokens to force re-authentication
    await AsyncStorage.removeItem('gmail_tokens');
    throw error;
  }
};