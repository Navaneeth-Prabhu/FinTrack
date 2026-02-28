import { create } from 'zustand';
import { supabase } from '@/services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface SupabaseAuthStore {
    session: Session | null;
    user: User | null;
    isLoading: boolean;

    // Call on app boot to restore persisted session
    initialize: () => Promise<void>;

    signInWithGoogle: (idToken: string, accessToken?: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export const useSupabaseAuthStore = create<SupabaseAuthStore>((set) => ({
    session: null,
    user: null,
    isLoading: true,

    initialize: async () => {
        set({ isLoading: true });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            set({ session, user: session?.user ?? null, isLoading: false });

            // Listen for future auth changes (token refresh, signout)
            supabase.auth.onAuthStateChange((_event, session) => {
                set({ session, user: session?.user ?? null });
            });
        } catch (err) {
            console.error('[Auth] Failed to initialize session:', err);
            set({ isLoading: false });
        }
    },

    signInWithGoogle: async (idToken: string, accessToken?: string) => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
                access_token: accessToken,
            });

            if (error) throw error;

            set({ session: data.session, user: data.user, isLoading: false });
            console.log('[Auth] Signed in with Google:', data.user?.email);
        } catch (err) {
            console.error('[Auth] Google sign-in failed:', err);
            set({ isLoading: false });
            throw err;
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
        console.log('[Auth] Signed out');
    },
}));
