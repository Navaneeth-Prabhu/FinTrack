// stores/slices/settingsSlice.ts
interface SettingsSlice {
    theme: 'light' | 'dark';
    currency: string;
    // other settings
  }
  
  const createSettingsSlice = (set: SetState<SettingsSlice>) => ({
    theme: 'light',
    currency: 'USD',
    // other settings
  });
