import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text as RNText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bareInput, colors, fonts, layout, radius, spacing } from '@/theme';
import { Icon } from './Icon';
import { Rise } from './Motion';
import { Button, Text } from './ui';

const ERROR_RING = 88;

export const ServerError = ({ retry }: ErrorBoundaryProps) => {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={styles.ring}>
          <Icon name="alert" size={40} color={colors.danger} strokeWidth={1.5} />
        </View>
        <Text variant="h1" align="center">Something went wrong on our side</Text>
        <Text variant="body" align="center" style={styles.message}>Your bag and account are safe. Try again in a moment. If it keeps happening, contact support.</Text>
        <View style={styles.actions}>
          <Button
            label={retrying ? 'Retrying' : 'Try again'}
            size="xl"
            loading={retrying}
            onPress={() => {
              setRetrying(true);
              retry().finally(() => setRetrying(false));
            }}
          />
          <Button label="Contact support" variant="outline" size="xl" onPress={() => router.push('/support')} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export const NotFound = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Rise>
          <RNText style={styles.code}>404</RNText>
        </Rise>
        <Text variant="h1" align="center">This page has stopped ticking</Text>
        <Text variant="body" align="center" style={styles.message}>The link may be old, or the watch may no longer be in our catalogue. Try a search instead.</Text>
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.secondary} strokeWidth={1.8} />
          <TextInput
            accessibilityLabel="Search watches"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => router.replace({ pathname: '/search', params: { q: query } })}
            placeholder="Search watches"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          <Button label="Search" size="sm" onPress={() => router.replace({ pathname: '/search', params: { q: query } })} />
        </View>
        <View style={styles.actions}>
          <Button label="Go to home" variant="outline" size="xl" onPress={() => router.replace('/')} />
          <Button label="Help centre" variant="neutral" size="xl" onPress={() => router.push('/faq')} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: layout.gutter },
  ring: { width: ERROR_RING, height: ERROR_RING, alignItems: 'center', justifyContent: 'center', borderRadius: ERROR_RING / 2, backgroundColor: colors.dangerSurface },
  code: { fontFamily: fonts.serif, fontSize: 96, lineHeight: 96, letterSpacing: -1.9, color: colors.primary },
  message: { maxWidth: 420 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  search: { alignSelf: 'stretch', height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  searchInput: { flex: 1, minWidth: 0, height: 48, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, ...bareInput },
});
