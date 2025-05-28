import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function YellowGradientBackground() {
  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2={height}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor="#FFF9C4" stopOpacity="10" />
          <Stop offset="100%" stopColor="#FFD600" stopOpacity="0.0000003" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#yellowGradient)" />
    </Svg>
  );
}
