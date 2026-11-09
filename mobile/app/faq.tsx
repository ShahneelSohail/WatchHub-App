import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Rise } from '@/components/Motion';
import { Page } from '@/components/Page';
import { Button, Eyebrow, Loading, Text } from '@/components/ui';
import { useFaqs } from '@/lib/catalog';
import { bareInput, colors, fonts, radius } from '@/theme';

export default function FaqScreen() {
  const router = useRouter();
  const { data: faqs, isPending } = useFaqs();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const needle = query.trim().toLowerCase();

  const matches = (faqs ?? []).filter(faq => !needle || `${faq.question} ${faq.answer}`.toLowerCase().includes(needle));
  const groups = [...new Set(matches.map(faq => faq.category))].map(category => ({ category, items: matches.filter(faq => faq.category === category) }));
  const selected = openId ?? (needle ? null : matches[0]?.id);

  return (
    <Page>
      <View style={styles.head}>
        <Eyebrow color={colors.primary}>Help centre</Eyebrow>
        <Text variant="h1" style={styles.title}>Frequently asked questions</Text>
      </View>
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.secondary} strokeWidth={1.8} />
        <TextInput accessibilityLabel="Search questions" value={query} onChangeText={setQuery} placeholder="Search questions, e.g. returns" placeholderTextColor={colors.muted} style={styles.searchInput} />
      </View>

      {isPending ? (
        <Loading />
      ) : groups.length === 0 ? (
        <View style={styles.none}>
          <Text variant="body" align="center">{`No questions match “${query}”.`}</Text>
        </View>
      ) : (
        groups.map(group => (
          <View key={group.category} style={styles.group}>
            <Text variant="eyebrow" style={styles.groupLabel}>{group.category}</Text>
            <View style={styles.list}>
              {group.items.map(faq => {
                const open = Boolean(needle) || selected === faq.id;
                return (
                  <View key={faq.id} style={styles.item}>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpenId(open ? -1 : faq.id)} style={styles.question}>
                      <Text variant="base" color={open ? colors.primary : colors.ink} style={styles.questionText}>{faq.question}</Text>
                      <View style={[styles.toggle, { backgroundColor: open ? colors.primary : colors.page }]}>
                        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                          <Icon name="down" size={14} color={open ? colors.onPrimary : colors.ink} strokeWidth={2} />
                        </View>
                      </View>
                    </Pressable>
                    {open && (
                      <Rise style={styles.answer}>
                        <Text variant="body" style={styles.answerText}>{faq.answer}</Text>
                      </Rise>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}

      <View style={styles.help}>
        <View style={styles.helpText}>
          <Text variant="title" color={colors.primary} style={styles.helpTitle}>Still need help?</Text>
          <Text variant="base" color={colors.primary}>Open a ticket and we’ll reply within 4 working hours.</Text>
        </View>
        <Button label="Contact support" size="lg" onPress={() => router.push('/support/new')} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { gap: 10, alignItems: 'flex-start' },
  title: { fontSize: 30 },
  search: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  searchInput: { flex: 1, minWidth: 0, height: 48, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, ...bareInput },
  none: { padding: 32, backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.base },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, letterSpacing: 1.56 },
  list: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  item: { borderBottomWidth: 1, borderBottomColor: colors.line },
  question: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 14, paddingHorizontal: 18 },
  questionText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 22 },
  toggle: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  answer: { paddingHorizontal: 18, paddingBottom: 18 },
  answerText: { lineHeight: 25 },
  help: { gap: 16, padding: 22, backgroundColor: colors.tint, borderRadius: radius.base },
  helpText: { gap: 4 },
  helpTitle: { fontSize: 22 },
});
