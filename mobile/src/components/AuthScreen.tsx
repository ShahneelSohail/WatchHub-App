import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '@/lib/api';
import { requestPasswordReset, useAuth } from '@/lib/auth';
import { colors, fonts, layout, radius } from '@/theme';
import { Icon } from './Icon';
import { Rise } from './Motion';
import { Page } from './Page';
import { useToast } from './Toast';
import { Button, Checkbox, FormError, Input, Text, TextButton } from './ui';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

const EMAIL_PATTERN = /^\S+@\S+\.\S{2,}$/;
const PASSWORD_PATTERN = (value: string) => value.length >= 8 && /\d/.test(value) && /[A-Z]/.test(value);
const PASSWORD_HINT = 'Use 8+ characters with a number and a capital letter';

const COPY: Record<AuthMode, { title: string; subtitle: string; cta: string; busy: string }> = {
  login: { title: 'Welcome back', subtitle: 'Sign in to see your orders, wishlist and saved addresses.', cta: 'Sign in', busy: 'Signing in' },
  register: { title: 'Create your account', subtitle: 'Save watches, check out faster and track every order.', cta: 'Create account', busy: 'Creating account' },
  forgot: { title: 'Reset your password', subtitle: 'Enter your account email and we’ll send you a link to choose a new password.', cta: 'Send reset link', busy: 'Sending' },
  reset: { title: 'Choose a new password', subtitle: 'Pick a password you haven’t used before.', cta: 'Update password', busy: 'Updating' },
};

interface Fields {
  name: string;
  email: string;
  password: string;
  terms: boolean;
}

type Errors = Partial<Record<keyof Fields, string>>;

const validate = (mode: AuthMode, { name, email, password, terms }: Fields): Errors => ({
  ...(mode !== 'reset' && !EMAIL_PATTERN.test(email) && { email: 'Enter a valid email address' }),
  ...(mode === 'register' && !name.trim() && { name: 'Enter your name' }),
  ...(mode === 'login' && !password && { password: 'Enter your password' }),
  ...((mode === 'register' || mode === 'reset') && !PASSWORD_PATTERN(password) && { password: PASSWORD_HINT }),
  ...(mode === 'register' && !terms && { terms: 'Please accept the terms to continue' }),
});

export const AuthScreen = ({ mode }: { mode: AuthMode }) => {
  const router = useRouter();
  const toast = useToast();
  const { login, register } = useAuth();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [fields, setFields] = useState<Fields>({ name: '', email: '', password: '', terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (mode === 'login') return login({ email: fields.email, password: fields.password });
      if (mode === 'register') return register({ name: fields.name.trim(), email: fields.email, password: fields.password });
      if (mode === 'forgot') return void (await requestPasswordReset(fields.email));
      return api.post('/auth/reset-password', { token, password: fields.password });
    },
    onSuccess: () => {
      if (mode === 'forgot') return setSent(true);
      if (mode === 'reset') {
        toast('success', 'Password updated. Sign in with your new password.');
        return router.replace('/login');
      }
      if (mode === 'register') toast('success', `Welcome to WatchHub, ${fields.name.trim().split(' ')[0]}`);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
  });

  const copy = COPY[mode];
  const set = <Key extends keyof Fields>(key: Key, value: Fields[Key]) => {
    setFields(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    submit.reset();
  };

  const onSubmit = () => {
    const found = validate(mode, fields);
    setErrors(found);
    if (Object.keys(found).length === 0) submit.mutate();
  };

  const goto = (path: '/login' | '/register' | '/forgot-password') => router.replace(path);
  const hasTabs = mode === 'login' || mode === 'register';

  return (
    <Page>
      <View style={styles.card}>
        {hasTabs && (
          <View accessibilityRole="tablist" style={styles.tabs}>
            {(['login', 'register'] as const).map(tab => (
              <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: mode === tab }} onPress={() => goto(tab === 'login' ? '/login' : '/register')} style={[styles.tab, { borderBottomColor: mode === tab ? colors.primary : 'transparent' }]}>
                <Text variant="body" color={mode === tab ? colors.primary : colors.secondary} style={{ fontFamily: mode === tab ? fonts.sansSemibold : fonts.sansMedium }}>{tab === 'login' ? 'Sign in' : 'Create account'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.titles}>
          <Text variant="h1" style={styles.title}>{sent ? 'Check your inbox' : copy.title}</Text>
          <Text variant="base" color={colors.secondary} style={styles.subtitle}>{sent ? `We’ve sent a reset link to ${fields.email}.` : copy.subtitle}</Text>
        </View>

        <FormError message={submit.isError ? submit.error.message : null} />

        {sent ? (
          <Rise style={styles.sent}>
            <View style={styles.sentIcon}>
              <Icon name="mail" size={28} color={colors.primary} strokeWidth={1.6} />
            </View>
            <Text variant="base" align="center" color={colors.secondary}>The link expires in 30 minutes. Check your spam folder if it doesn’t arrive.</Text>
            <Button label="Back to sign in" size="xl" onPress={() => goto('/login')} />
            <TextButton label="Resend link" onPress={() => submit.mutate()} />
          </Rise>
        ) : (
          <View style={styles.form}>
            {mode === 'register' && <Input label="Full name" autoComplete="name" height={48} value={fields.name} error={errors.name} onChangeText={value => set('name', value)} />}
            {mode !== 'reset' && (
              <Input label="Email" autoComplete="email" keyboardType="email-address" autoCapitalize="none" height={48} value={fields.email} error={errors.email} onChangeText={value => set('email', value)} />
            )}
            {mode !== 'forgot' && (
              <View style={styles.passwordBlock}>
                {mode === 'login' && (
                  <View style={styles.passwordHead}>
                    <Text variant="label">Password</Text>
                    <TextButton label="Forgot password?" onPress={() => goto('/forgot-password')} style={styles.forgot} />
                  </View>
                )}
                <Input
                  {...(mode === 'login' && { accessibilityLabel: 'Password' })}
                  label={mode === 'login' ? undefined : mode === 'reset' ? 'New password' : 'Password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  height={48}
                  value={fields.password}
                  error={errors.password}
                  onChangeText={value => set('password', value)}
                  right={<TextButton label={showPassword ? 'Hide' : 'Show'} onPress={() => setShowPassword(shown => !shown)} />}
                />
              </View>
            )}
            {mode === 'register' && (
              <>
                <Text variant="small">At least 8 characters, with a number and a capital letter.</Text>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: fields.terms }} onPress={() => set('terms', !fields.terms)} style={styles.terms}>
                  <Checkbox checked={fields.terms} invalid={Boolean(errors.terms)} />
                  <Text variant="base" style={styles.termsLabel}>I agree to the terms of sale and privacy policy</Text>
                </Pressable>
                {errors.terms && <Text variant="small" color={colors.dangerInk}>{errors.terms}</Text>}
              </>
            )}
            <Button label={submit.isPending ? copy.busy : copy.cta} size="xl" loading={submit.isPending} onPress={onSubmit} />
            {mode === 'forgot' && <TextButton label="← Back to sign in" onPress={() => goto('/login')} size={14} style={styles.back} />}
          </View>
        )}
      </View>
    </Page>
  );
};

const styles = StyleSheet.create({
  card: { gap: 18, paddingVertical: 24, paddingHorizontal: layout.gutter, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, marginBottom: -1 },
  titles: { gap: 6 },
  title: { fontSize: 30, lineHeight: 33 },
  subtitle: { lineHeight: 21 },
  form: { gap: 14 },
  passwordBlock: { gap: 6 },
  passwordHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgot: { minHeight: 24 },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  termsLabel: { flex: 1, color: colors.ink, lineHeight: 21 },
  back: { alignSelf: 'center' },
  sent: { alignItems: 'stretch', gap: 14, paddingVertical: 16 },
  sentIcon: { alignSelf: 'center', width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: colors.tint },
});
