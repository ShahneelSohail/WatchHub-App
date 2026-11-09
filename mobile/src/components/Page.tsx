import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { colors, layout, spacing } from '@/theme';
import { AppHeader } from './Chrome';
import { Button, EmptyState, Loading, Text } from './ui';

interface PageProps {
  back?: boolean;
  trailing?: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export const Page = ({ back = true, trailing, footer, refreshing = false, onRefresh, contentStyle, children }: PageProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <AppHeader back={back} trailing={trailing} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }, contentStyle]}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer}
    </View>
  );
};

export const TabPage = ({ refreshing = false, onRefresh, contentStyle, stickyHeaderIndices, children }: Omit<PageProps, 'back' | 'trailing' | 'footer'> & { stickyHeaderIndices?: number[] }) => (
  <ScrollView
    style={styles.root}
    stickyHeaderIndices={stickyHeaderIndices}
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={[styles.content, contentStyle]}
    refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
  >
    {children}
  </ScrollView>
);

export const PageHeading = ({ title, aside }: { title: string; aside?: string }) => (
  <View style={styles.heading}>
    <Text variant="h1" style={styles.headingText}>{title}</Text>
    {aside ? <Text variant="body" style={styles.headingAside}>{aside}</Text> : null}
  </View>
);

const SignInPrompt = () => {
  const router = useRouter();
  return (
    <EmptyState
      icon="user"
      title="Sign in to continue"
      message="Your bag, wishlist, orders and addresses live in your WatchHub account."
      actions={
        <>
          <Button label="Sign in" size="lg" onPress={() => router.push('/login')} />
          <Button label="Create account" variant="outline" size="lg" onPress={() => router.push('/register')} />
        </>
      }
    />
  );
};

const AuthGate = ({ children, Layout }: { children: ReactNode; Layout: (props: { children: ReactNode }) => ReactNode }) => {
  const { user, ready } = useAuth();
  if (user) return <>{children}</>;
  return <Layout>{ready ? <SignInPrompt /> : <Loading />}</Layout>;
};

const StackLayout = ({ children }: { children: ReactNode }) => <Page>{children}</Page>;

export const RequireAuth = ({ children }: { children: ReactNode }) => <AuthGate Layout={StackLayout}>{children}</AuthGate>;

export const TabRequireAuth = ({ children }: { children: ReactNode }) => <AuthGate Layout={TabPage}>{children}</AuthGate>;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  content: { gap: 20, paddingHorizontal: spacing.lg, paddingTop: layout.gutter, paddingBottom: spacing.xxl },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' },
  headingText: { fontSize: 30, lineHeight: 32 },
  headingAside: { fontSize: 15 },
});
