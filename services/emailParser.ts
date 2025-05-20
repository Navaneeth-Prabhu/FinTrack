import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Buffer from 'expo-standard-web-crypto';
import { Transaction, Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CLIENT_ID = '301412680308-6tpn8f9k3ll0bam898dogavmh97jlfoh.apps.googleusercontent.com'; // Replace with your Google Client ID
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'fintrack', path: 'redirect' });
const AUTH_TOKENS_KEY = 'gmail_auth_tokens';
const LAST_SYNC_DATE_KEY = 'gmail_last_sync_date';

// Transaction patterns (same as yours, simplified for brevity)
const TRANSACTION_PATTERNS = [
  {
    name: 'credit_card_transaction',
    regex: /(?:charged|payment|purchase|transaction)\s+(?:of|for)?\s*\$?(\d+\.?\d*)/i,
    type: 'expense' as const,
    extractAmount: (match: RegExpMatchArray) => parseFloat(match[1]),
    category: (text: string) => categorizeTransaction(text),
  },
  // Add other patterns as needed
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['restaurant', 'cafe', 'food'],
  transport: ['uber', 'lyft', 'taxi'],
  shopping: ['amazon', 'walmart'],
  // Add more as needed
};

const categorizeTransaction = (text: string): string => {
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) return category;
  }
  return 'other';
};

const extractMerchant = (text: string): string => {
  const match = text.match(/(?:at|to|from|via)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+on|\s+for|$)/i);
  return match ? match[1].trim() : 'Unknown';
};

export const checkAuthStatus = async (): Promise<boolean> => {
  const tokens = await AsyncStorage.getItem(AUTH_TOKENS_KEY);
  return !!tokens;
};

export const authenticateGmail = async (): Promise<boolean> => {
  try {
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    };

    const authRequest = new AuthSession.AuthRequest({
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      responseType: 'code',
      usePKCE: true, // Use PKCE instead of client secret
    });

    const result = await authRequest.promptAsync(discovery);
    if (result.type !== 'success') return false;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: result.params.code,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier: authRequest.codeVerifier || '',
      }).toString(),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error_description);

    await AsyncStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify(tokens));
    return true;
  } catch (error) {
    console.error('Auth error:', error);
    return false;
  }
};

export const signOutGmail = async (): Promise<void> => {
  await AsyncStorage.removeItem(AUTH_TOKENS_KEY);
};

const refreshTokensIfNeeded = async (): Promise<any> => {
  const tokensString = await AsyncStorage.getItem(AUTH_TOKENS_KEY);
  if (!tokensString) throw new Error('Not authenticated');

  const tokens = JSON.parse(tokensString);
  const expiryDate = tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : 0;

  if (expiryDate > Date.now()) return tokens;

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: tokens.refresh_token,
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const newTokens = await refreshResponse.json();
  if (newTokens.error) throw new Error(newTokens.error_description);

  await AsyncStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify(newTokens));
  return newTokens;
};

export const fetchGmailMessages = async (): Promise<any[]> => {
  const tokens = await refreshTokensIfNeeded();
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=transaction%20from:bank&maxResults=10',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const data = await response.json();
  if (!data.messages) return [];

  const messages = await Promise.all(
    data.messages.map(async (msg: any) => {
      const fullMsg = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      return fullMsg.json();
    })
  );

  await AsyncStorage.setItem(LAST_SYNC_DATE_KEY, new Date().toISOString());
  return messages;
};

export const extractEmailContent = (message: any) => {
  const headers = message.payload.headers;
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
  const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
  let body = '';

  const extractText = (parts: any[]): string => {
    if (!parts) return '';
    return parts
      .map(part => {
        if (part.mimeType === 'text/plain' && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        return part.parts ? extractText(part.parts) : '';
      })
      .join('');
  };

  if (message.payload.parts) {
    body = extractText(message.payload.parts);
  } else if (message.payload.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  return { id: message.id, subject, date: new Date(date), body, snippet: message.snippet };
};

export const parseEmailForTransactions = (email: any): any[] => {
  const text = email.body || email.snippet;
  const transactions: any[] = [];

  for (const pattern of TRANSACTION_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const amount = pattern.extractAmount(match);
      if (!isNaN(amount) && amount > 0) {
        transactions.push({
          amount,
          type: pattern.type,
          category: pattern.category(text),
          merchant: extractMerchant(text),
          date: email.date,
          sourceId: email.id,
          subject: email.subject,
          description: email.snippet,
        });
      }
    }
  }
  return transactions;
};

export const convertToAppTransaction = (emailTx: any, categories: Category[]): Transaction => {
  const category = categories.find(c => c.name.toLowerCase() === emailTx.category.toLowerCase()) || categories[0];
  return {
    id: uuidv4(),
    title: emailTx.merchant !== 'Unknown' ? emailTx.merchant : emailTx.subject.substring(0, 40),
    amount: emailTx.amount,
    type: emailTx.type,
    category,
    description: emailTx.description.substring(0, 100),
    date: emailTx.date,
    createdAt: new Date().toString(),
    updatedAt: new Date(),
    isRecurring: false,
    metadata: { source: 'email', sourceId: emailTx.sourceId },
  };
};

export const importTransactionsFromGmail = async (categories: Category[]): Promise<Transaction[]> => {
  const messages = await fetchGmailMessages();
  const emailContents = messages.map(extractEmailContent);
  const emailTransactions = emailContents.flatMap(parseEmailForTransactions);
  return emailTransactions.map(tx => convertToAppTransaction(tx, categories));
};