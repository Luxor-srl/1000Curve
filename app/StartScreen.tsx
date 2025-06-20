import { checkAuthStatus } from '@/utils/auth';
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

import YellowGradientBackground from '../components/YellowGradientBackground';

import { useRouter } from 'expo-router';

export default function StartScreen() {
  const [unlocked, setUnlocked] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const translateX = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const router = useRouter();

  // Controlla se l'utente è già autenticato all'avvio
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        setIsCheckingAuth(true);
        console.log('Controllo autenticazione in corso...');
        
        // Aggiungi un timeout per evitare blocchi infiniti
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout controllo autenticazione')), 10000)
        );
        
        const authCheckPromise = checkAuthStatus();
        const authStatus = await Promise.race([authCheckPromise, timeoutPromise]) as any;
        
        console.log('Stato autenticazione:', authStatus);
        
        if (authStatus?.isAuthenticated && authStatus?.raceData) {
          console.log('Utente già autenticato, reindirizzamento...');
          
          // Naviga direttamente alla pagina race
          router.replace({
            pathname: '/race',
            params: {
              raceData: JSON.stringify(authStatus.raceData),
            },
          });
          return;
        } else {
          console.log('Utente non autenticato, mostra schermata di avvio');
        }
      } catch (error) {
        console.error('Errore nel controllo autenticazione:', error);
        // In caso di errore, mostra comunque la schermata di avvio
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, [router]);

  // Animazione pulsante per indicare lo scorrimento
  useEffect(() => {
    if (!unlocked && !isCheckingAuth) {
      pulseAnimation.value = withRepeat(
        withTiming(1.1, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [unlocked, isCheckingAuth]);

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
      
      <View style={styles.centerContent}>
        <Image source={require('../assets/images/logo-mille-dark.png')} style={styles.logo} resizeMode="contain"/>
        <Text style={styles.hashtag} allowFontScaling={false}>#NOWFORALL</Text>
      </View>
      
      {isCheckingAuth ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText} allowFontScaling={false}>Verifica autenticazione...</Text>
        </View>
      ) : (
        <View style={styles.swiperContainer}>
          <View style={styles.swiperBg}>
            <Text style={styles.swiperText} allowFontScaling={false}>Entra nel Mito</Text>

            {/* Frecce animate per indicare lo scorrimento */}
            <Animated.View style={[styles.arrowContainer, arrowOpacity]}>
              <Text style={styles.arrow} allowFontScaling={false}>›››</Text>
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
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
