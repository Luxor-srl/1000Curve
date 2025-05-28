import React from 'react';
import { Dimensions } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');
const HEIGHT = 180;

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function AnimatedWave() {
  const phase = useSharedValue(0);

  React.useEffect(() => {
    phase.value = withRepeat(withTiming(2 * Math.PI, { duration: 3000 }), -1, false);
  }, []);

  // Props animate per la path
  const animatedProps = useAnimatedProps(() => {
    // Parametri onda
    const amplitude = 30;
    const frequency = 2;
    const points = 40;
    let d = `M0,${HEIGHT}`;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const y =
        amplitude * Math.sin(frequency * ((i / points) * Math.PI * 2) + phase.value) + 60;
      d += ` L${x},${y}`;
    }
    d += ` L${width},${HEIGHT} L0,${HEIGHT} Z`;
    return { d };
  });

  return (
    <Svg
      width={width}
      height={HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <AnimatedPath
        animatedProps={animatedProps}
        fill="#FFD600"
        opacity={0.95}
        // Capovolgi verticalmente usando l'attributo SVG transform
        transform={`scale(1,-1) translate(0, -${HEIGHT})`}
      />
    </Svg>
  );
}
