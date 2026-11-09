import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAuth } from '@/lib/auth';
import { useReviews, useSubmitReview } from '@/lib/catalog';
import { formatDate, formatWholeMoney } from '@/lib/format';
import { useReducedMotion } from '@/lib/motion';
import { useOrders } from '@/lib/orders';
import type { Review, StrapType, Watch } from '@/lib/types';
import { availableStraps, priceColor, unitPrice, watchBadge, watchImage } from '@/lib/watch';
import { colors, layout, motion, radius, spacing } from '@/theme';
import { Icon } from './Icon';
import { Rise } from './Motion';
import { Photo } from './Photo';
import { Alert, Badge, Button, Input, Stars, Text } from './ui';
import { useToast } from './Toast';

const SWATCH = 32;

export const ColourPicker = ({ watch, selected, onSelect }: { watch: Watch; selected: number; onSelect: (index: number) => void }) => (
  <View style={styles.option}>
    <View style={styles.optionHead}>
      <Text variant="label" color={colors.secondary}>Colour</Text>
      <Text variant="label">{watch.colors[selected]?.name}</Text>
    </View>
    <View style={styles.swatches}>
      {watch.colors.map((color, index) => (
        <Pressable key={color.name} accessibilityRole="radio" accessibilityLabel={color.name} accessibilityState={{ selected: index === selected }} onPress={() => onSelect(index)} style={styles.swatchHit}>
          <View style={[styles.swatch, { backgroundColor: color.hex }, index === selected ? styles.swatchSelected : styles.swatchIdle]} />
        </Pressable>
      ))}
    </View>
  </View>
);

const StrapGlyph = ({ type, color }: { type: StrapType; color: string }) => (
  <Svg width={44} height={22} viewBox="0 0 44 22" fill="none">
    {type === 'BELT' ? (
      <>
        <Rect x={1} y={6} width={42} height={10} rx={2} stroke={color} strokeWidth={1.4} />
        <Path d="M4 8.5h36M4 13.5h36" stroke={color} strokeWidth={1.4} strokeDasharray="2 2" opacity={0.6} />
        <Circle cx={31} cy={11} r={1.2} stroke={color} strokeWidth={1.4} />
        <Circle cx={35} cy={11} r={1.2} stroke={color} strokeWidth={1.4} />
      </>
    ) : (
      [1, 10, 19, 28].map(x => <Rect key={x} x={x} y={5} width={8} height={12} rx={1.5} stroke={color} strokeWidth={1.4} />).concat(<Rect key={37} x={37} y={5} width={6} height={12} rx={1.5} stroke={color} strokeWidth={1.4} />)
    )}
  </Svg>
);

export const StrapPicker = ({ watch, selected, onSelect }: { watch: Watch; selected: StrapType | null; onSelect: (type: StrapType) => void }) => {
  const straps = availableStraps(watch);
  if (straps.length === 0) return null;
  return (
    <View style={styles.option}>
      <View style={styles.optionHead}>
        <Text variant="label" color={colors.secondary}>Strap</Text>
        <Text variant="label">{straps.find(strap => strap.type === selected)?.label}</Text>
      </View>
      <View style={styles.straps}>
        {straps.map(({ type, label, detail }) => {
          const on = type === selected;
          return (
            <Pressable key={type} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onSelect(type)} style={[styles.strap, on && styles.strapOn]}>
              <StrapGlyph type={type} color={on ? colors.primary : colors.secondary} />
              <View style={styles.strapText}>
                <Text variant="baseMedium">{label}</Text>
                <Text variant="small">{detail}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export type AddPhase = 'idle' | 'loading' | 'added';

export const AddToBagButton = ({ phase, soldOut, price, notified, onPress }: { phase: AddPhase; soldOut: boolean; price: string; notified: boolean; onPress: () => void }) => {
  const reducedMotion = useReducedMotion();
  const tone = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(tone, { toValue: phase === 'added' ? 1 : 0, duration: reducedMotion ? 1 : 300, useNativeDriver: false }).start();
  }, [phase, tone, reducedMotion]);
  const backgroundColor = soldOut ? colors.surface : tone.interpolate({ inputRange: [0, 1], outputRange: [colors.primary, colors.success] });
  const fg = soldOut ? colors.ink : colors.onPrimary;
  return (
    <Animated.View style={[styles.addButton, { backgroundColor, borderColor: soldOut ? colors.muted : 'transparent' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={soldOut ? 'Notify me when available' : 'Add to bag'} disabled={phase !== 'idle' || (soldOut && notified)} onPress={onPress} style={styles.addPress}>
        {phase === 'loading' ? (
          <Spin />
        ) : (
          <>
            <Text variant="strong" color={fg} style={styles.addLabel}>{soldOut ? (notified ? 'We’ll email you' : 'Notify me when available') : phase === 'added' ? 'Added to bag' : 'Add to bag'}</Text>
            {!soldOut && phase === 'idle' && <Text variant="base" color={fg} style={styles.addPrice}>{price}</Text>}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

const Spin = () => {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: motion.addSpinMs, easing: (value: number) => value, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />;
};

export const SpecList = ({ watch }: { watch: Watch }) => {
  const rows = [['Reference', watch.sku], ...Object.entries(watch.specifications)];
  return (
    <View>
      {rows.map(([key, value]) => (
        <View key={key} style={styles.spec}>
          <Text variant="base" color={colors.secondary} style={styles.specKey}>{key}</Text>
          <Text variant="base" style={styles.specValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
};

const STAR_VALUES = [5, 4, 3, 2, 1];

const RatingSummary = ({ watch, reviews }: { watch: Watch; reviews: Review[] }) => (
  <View style={styles.summary}>
    <View style={styles.summaryScore}>
      <Text variant="display" style={styles.scoreNumber}>{watch.rating.average?.toFixed(1) ?? '–'}</Text>
      <Stars value={Math.round(watch.rating.average ?? 0)} size={12} />
    </View>
    <View style={styles.distribution}>
      {STAR_VALUES.map(star => {
        const share = reviews.length ? Math.round((reviews.filter(review => review.rating === star).length / reviews.length) * 100) : 0;
        return (
          <View key={star} style={styles.distRow}>
            <Text variant="small" style={styles.distStar}>{star}</Text>
            <View style={styles.distTrack}>
              <View style={[styles.distFill, { width: `${share}%` }]} />
            </View>
            <Text variant="small" style={styles.distShare}>{`${share}%`}</Text>
          </View>
        );
      })}
    </View>
  </View>
);

const ReviewForm = ({ watch, onClose }: { watch: Watch; onClose: () => void }) => {
  const toast = useToast();
  const submit = useSubmitReview(watch.id, watch.slug);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const send = () => {
    if (!rating) return setError('Choose a star rating');
    setError(null);
    submit.mutate({ rating, comment }, { onSuccess: () => { toast('success', 'Thanks. Your review has been submitted.'); onClose(); }, onError: failure => setError(failure.message) });
  };

  return (
    <Rise style={styles.reviewForm}>
      <View style={styles.reviewFormHead}>
        <Text variant="baseMedium">Your review</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelReview}>
          <Text variant="label" color={colors.secondary}>Cancel</Text>
        </Pressable>
      </View>
      <View style={styles.starPicker}>
        {STAR_VALUES.slice().reverse().map(value => (
          <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} star${value > 1 ? 's' : ''}`} onPress={() => setRating(value)} style={styles.starHit}>
            <Icon name="star" size={26} color={value <= rating ? colors.primary : colors.secondary} strokeWidth={1.4} fill={value <= rating ? colors.primary : 'none'} />
          </Pressable>
        ))}
      </View>
      <Input label="Review" multiline value={comment} onChangeText={setComment} />
      {error && <Alert tone="danger">{error}</Alert>}
      <Button label="Submit review" size="lg" loading={submit.isPending} onPress={send} />
      <Text variant="small">Reviews are checked by our team before they appear.</Text>
    </Rise>
  );
};

export const ReviewsSection = ({ watch }: { watch: Watch }) => {
  const { user } = useAuth();
  const reviews = useReviews(watch.id);
  const orders = useOrders();
  const [writing, setWriting] = useState(false);
  const items = reviews.data?.items ?? [];
  const delivered = Boolean(user && orders.data?.items.some(order => order.status === 'DELIVERED' && order.items.some(item => item.watchId === watch.id)));
  const count = watch.rating.count;

  return (
    <View style={styles.reviews}>
      <View style={styles.reviewsHead}>
        <Text variant="h2">Reviews</Text>
        <Text variant="small" style={styles.reviewsCount}>{`${count} ${count === 1 ? 'review' : 'reviews'}`}</Text>
      </View>
      {count > 0 && <RatingSummary watch={watch} reviews={items} />}
      {delivered && !writing && <Button label="Write a review" variant="neutral" onPress={() => setWriting(true)} />}
      {writing && <ReviewForm watch={watch} onClose={() => setWriting(false)} />}
      {count === 0 && <Text variant="body">No reviews yet.</Text>}
      {items.map(review => (
        <View key={review.id} style={styles.review}>
          <View style={styles.reviewMeta}>
            <Stars value={review.rating} size={12} />
            <Text variant="meta">{formatDate(review.createdAt)}</Text>
          </View>
          <Text variant="base" color={colors.secondary} style={styles.reviewBody}>{review.comment}</Text>
          <Text variant="small">{`${review.user.name} · Verified buyer`}</Text>
          {review.adminReply && (
            <View style={styles.reply}>
              <Text variant="brand" color={colors.primary}>WatchHub replied</Text>
              <Text variant="label" color={colors.secondary} style={styles.replyBody}>{review.adminReply}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

export const RelatedRail = ({ watches, onOpen }: { watches: Watch[]; onOpen: (watch: Watch) => void }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} snapToInterval={168} decelerationRate="fast">
    {watches.map(watch => (
      <RelatedCard key={watch.id} watch={watch} onPress={() => onOpen(watch)} />
    ))}
  </ScrollView>
);

const RelatedCard = ({ watch, onPress }: { watch: Watch; onPress: () => void }) => {
  const badge = watchBadge(watch);
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={watch.name} onPress={onPress} style={styles.related}>
      <View style={styles.relatedImage}>
        <Photo path={watchImage(watch)} style={StyleSheet.absoluteFill} />
        {badge && (
          <View style={styles.relatedBadge}>
            <Badge badge={badge} small />
          </View>
        )}
      </View>
      <Text variant="brand">{watch.brand.name}</Text>
      <Text variant="cardTitle" style={styles.relatedName}>{watch.name}</Text>
      <Text variant="label" color={priceColor(watch)}>{formatWholeMoney(unitPrice(watch))}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  option: { gap: 12 },
  optionHead: { flexDirection: 'row', justifyContent: 'space-between' },
  swatches: { flexDirection: 'row', gap: 14 },
  swatchHit: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2 },
  swatchSelected: { boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 3.5px ${colors.primary}` },
  swatchIdle: { boxShadow: `0 0 0 1px ${colors.line}` },
  straps: { flexDirection: 'row', gap: 10 },
  strap: { flex: 1, minHeight: 96, gap: 10, padding: 14, alignItems: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  strapOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  strapText: { gap: 2 },
  addButton: { flex: 1, height: layout.buttonPrimary, borderWidth: 1, borderRadius: radius.base },
  addPress: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  addLabel: { fontSize: 15, letterSpacing: 0.15 },
  addPrice: { opacity: 0.75, fontVariant: ['tabular-nums'] },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderTopColor: colors.surface },
  spec: { flexDirection: 'row', gap: spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  specKey: { width: 128 },
  specValue: { flex: 1, lineHeight: 20 },
  reviews: { gap: 18 },
  reviewsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  reviewsCount: { fontSize: 13 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: layout.gutter },
  summaryScore: { gap: 4, alignItems: 'flex-start' },
  scoreNumber: { fontSize: 52, lineHeight: 52 },
  distribution: { flex: 1, gap: 5 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distStar: { width: 10, fontSize: 11 },
  distTrack: { flex: 1, height: 4, backgroundColor: colors.line },
  distFill: { height: 4, backgroundColor: colors.primary },
  distShare: { width: 30, textAlign: 'right', fontSize: 11 },
  reviewForm: { gap: 14, padding: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  reviewFormHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelReview: { minHeight: 32, justifyContent: 'center' },
  starPicker: { flexDirection: 'row', gap: 4 },
  starHit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  review: { gap: 8, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.line },
  reviewMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewBody: { lineHeight: 22 },
  reply: { gap: 4, marginTop: 4, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: radius.base },
  replyBody: { lineHeight: 19 },
  rail: { gap: spacing.md, paddingHorizontal: layout.gutter },
  related: { width: 156, gap: 8 },
  relatedImage: { aspectRatio: 4 / 5 },
  relatedBadge: { position: 'absolute', top: 8, left: 8 },
  relatedName: { fontSize: 16, lineHeight: 18 },
});
