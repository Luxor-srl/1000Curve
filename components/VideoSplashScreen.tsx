import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface VideoSplashScreenProps {
  onVideoEnd: () => void;
}

export default function VideoSplashScreen({ onVideoEnd }: VideoSplashScreenProps) {
  const videoSource = require('../assets/images/1000curve-video.mp4');
  const opacity = useSharedValue(1);
  const isAnimating = useRef(false);
  
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.play();
  });

  const handleVideoEndWithAnimation = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    
    opacity.value = withTiming(0, { duration: 500 }, (finished) => {
      if (finished) {
        runOnJS(onVideoEnd)();
      }
    });
  };

  useEffect(() => {
    // Auto-dismiss video after 5 seconds as fallback
    const timer = setTimeout(() => {
      handleVideoEndWithAnimation();
    }, 5000);

    // Listen for when video ends
    const subscription = player.addListener('playToEnd', () => {
      handleVideoEndWithAnimation();
    });

    return () => {
      clearTimeout(timer);
      subscription?.remove();
    };
  }, [player]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen={false}
        showsTimecodes={false}
        requiresLinearPlayback={true}
        contentFit="cover"
        nativeControls={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: '#000',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
});
