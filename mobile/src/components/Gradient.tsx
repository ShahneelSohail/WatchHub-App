import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface GradientProps {
  id: string;
  stops: { offset: string; color: string; opacity?: number }[];
}

export const VerticalGradient = ({ id, stops }: GradientProps) => (
  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none" pointerEvents="none">
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map(({ offset, color, opacity = 1 }) => (
          <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
        ))}
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill={`url(#${id})`} />
  </Svg>
);
