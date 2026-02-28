import GoogleSignInScreen from '@/screens/auth/GoogleSignInScreen';
import { router } from 'expo-router';
import { useSupabaseAuthStore } from '@/stores/supabaseAuthStore';

export default function GoogleSignInRoute() {
    const { user } = useSupabaseAuthStore();

    const handleSuccess = () => {
        // Navigate back to wherever the user came from
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    const handleSkip = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <GoogleSignInScreen
            onSuccess={handleSuccess}
            onSkip={handleSkip}
        />
    );
}
