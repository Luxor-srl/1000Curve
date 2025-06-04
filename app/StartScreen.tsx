import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';


const { width } = Dimensions.get('window');
const SWIPER_WIDTH = width * 0.9;
const SWIPER_HEIGHT = 80;
const CIRCLE_SIZE = 68;
const LOCK_SIZE = 30;
const SWIPE_THRESHOLD = SWIPER_WIDTH - CIRCLE_SIZE - 12;

import AnimatedWave from '../components/AnimatedWave';
import YellowGradientBackground from '../components/YellowGradientBackground';


import { useRouter } from 'expo-router';

export default function StartScreen() {
  const [unlocked, setUnlocked] = useState(false);
  const translateX = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const router = useRouter();

  // Animazione pulsante per indicare lo scorrimento
  useEffect(() => {
    if (!unlocked) {
      pulseAnimation.value = withRepeat(
        withTiming(1.1, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [unlocked]);

  const onUnlock = () => {
    setUnlocked(true);
    pulseAnimation.value = withTiming(1);
    setTimeout(() => {
      router.replace('/login');
    }, 500);
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      pulseAnimation.value = withTiming(1);
    },
    onActive: (event) => {
      translateX.value = Math.max(0, Math.min(event.translationX, SWIPE_THRESHOLD));
    },
    onEnd: () => {
      if (translateX.value > SWIPE_THRESHOLD * 0.8) {
        translateX.value = withSpring(SWIPE_THRESHOLD);
        runOnJS(onUnlock)();
      } else {
        translateX.value = withSpring(0);
        if (!unlocked) {
          pulseAnimation.value = withRepeat(
            withTiming(1.1, { duration: 1000 }),
            -1,
            true
          );
        }
      }
    },
  });

  const lockStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: pulseAnimation.value }
    ],
  }));

  const arrowOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD * 0.3], [1, 0]),
  }));

  return (
    <View style={styles.container}>
      {/* Background giallo sfumato */}
      <YellowGradientBackground />
      {/* Onda animata gialla in alto */}
      <View style={styles.topImageContainer}>
        <AnimatedWave />
      </View>

      <View style={styles.centerContent}>
        <Image source={require('../assets/images/logo-mille-dark.png')} style={styles.logo} resizeMode="contain"/>
        <Text style={styles.hashtag}>#NOWFORALL</Text>
      </View>
      <View style={styles.swiperContainer}>
        <View style={styles.swiperBg}>
          <Text style={styles.swiperText}>Entra nel Mito</Text>

          {/* Frecce animate per indicare lo scorrimento */}
          <Animated.View style={[styles.arrowContainer, arrowOpacity]}>
            <Text style={styles.arrow}>›››</Text>
          </Animated.View>

          <PanGestureHandler onGestureEvent={gestureHandler} enabled={!unlocked}>
            <Animated.View style={[styles.lockContainer, lockStyle]}>
              <View style={styles.lockCircle}>
                <FontAwesome 
                  name={unlocked ? 'unlock' : 'lock'} 
                  size={LOCK_SIZE} 
                  color="#333" 
                />
              </View>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
    topImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    },
    splashImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover', 
    },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  hashtag: {
    color: '#FFD600',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  swiperContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  swiperBg: {
    width: SWIPER_WIDTH,
    height: SWIPER_HEIGHT,
    backgroundColor: '#FFD600',
    borderRadius: SWIPER_HEIGHT / 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  swiperText: {
    color: '#111',
    fontSize: 22,
    fontWeight: 'bold',
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 0,
  },
  arrowContainer: {
    position: 'absolute',
    right: 30,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  arrow: {
    color: '#333',
    fontSize: 24,
    fontWeight: 'bold',
    opacity: 0.6,
  },
  lockContainer: {
    position: 'absolute',
    left: 6,
    top: (SWIPER_HEIGHT - CIRCLE_SIZE) / 2,
    zIndex: 2,
  },
  lockCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lock: {
    position: 'absolute',
    left: 8,
    top: (SWIPER_HEIGHT - LOCK_SIZE) / 2,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
});
