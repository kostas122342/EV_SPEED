import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { createSaveStore } from './saveStore.js';

export const saveStorage = createSaveStore({
    native: Capacitor.isNativePlatform(),
    preferences: Preferences,
    local: () => window.localStorage
});
