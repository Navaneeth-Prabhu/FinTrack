import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://rgpgitjjoxxobpvezknd.supabase.co';
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJncGdpdGpqb3h4b2JwdmV6a25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MzU2MzYsImV4cCI6MjA3MjExMTYzNn0.67MrZcJPvRfOYvn8Nwm8EtX5dJpcygYWOaX89XOUL9E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
