import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'watchhub_token';

const isWeb = Platform.OS === 'web';

let token: string | null = null;

export const getToken = (): string | null => token;

export const restoreToken = async (): Promise<void> => {
  token = isWeb ? globalThis.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
};

export const storeToken = async (value: string | null): Promise<void> => {
  token = value;
  if (isWeb) {
    if (value) globalThis.localStorage.setItem(KEY, value);
    else globalThis.localStorage.removeItem(KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(KEY, value);
  else await SecureStore.deleteItemAsync(KEY);
};
