import { useState, useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Register web browser redirect handler
WebBrowser.maybeCompleteAuthSession();

// Configure client ID based on platform
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your client ID
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'your-app-scheme', // Replace with your app's scheme
  path: 'redirect'
});

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly'
];

export const useGmailAuth = () => {
  const [request, setRequest] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };
  
  // Check if user is already authenticated
  const checkAuthStatus = async () => {
    try {
      const tokens = await AsyncStorage.getItem('gmail_tokens');
      if (tokens) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  };
  
  // Initialize authentication request
  useEffect(() => {
    const initAuth = async () => {
      const authStatus = await checkAuthStatus();
      if (!authStatus) {
        const authRequest = new AuthSession.AuthRequest({
          clientId: CLIENT_ID,
          scopes: SCOPES,
          redirectUri: REDIRECT_URI,
          responseType: 'code',
          usePKCE: false,
          extraParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        });
        
        setRequest(authRequest);
      }
    };
    
    initAuth();
  }, []);
  
  // Exchange authorization code for tokens
  const exchangeCodeForTokens = async (code) => {
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: 'YOUR_CLIENT_SECRET', // Replace with your client secret
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }).toString(),
      });
      
      const tokens = await tokenResponse.json();
      
      if (tokens.error) {
        throw new Error(tokens.error_description || 'Failed to exchange code for tokens');
      }
      
      // Store tokens
      await AsyncStorage.setItem('gmail_tokens', JSON.stringify(tokens));
      
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  };
  
  // Authenticate with Gmail
  const authenticate = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      
      if (!request) {
        throw new Error('Auth request not initialized');
      }
      
      // Prompt user to authorize
      const result = await request.promptAsync(discovery);
      
      if (result.type === 'success') {
        // Exchange authorization code for tokens
        const code = result.params.code;
        await exchangeCodeForTokens(code);
        
        setIsAuthenticated(true);
        return true;
      } else {
        throw new Error('Authorization failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError(error.message);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  // Sign out
  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('gmail_tokens');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return {
    authenticate,
    signOut,
    isAuthenticating,
    isAuthenticated,
    authError,
    checkAuthStatus,
  };
};

export default useGmailAuth;