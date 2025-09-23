import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function Sidebar({ isVisible, onClose }: SidebarProps) {
  const slideAnim = useRef(new Animated.Value(-250)).current; // Inizia fuori schermo
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Anima apertura
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Anima chiusura
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -250,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, fadeAnim]);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/logo-mille-dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.menuItems}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); console.log('Le Mie Gare pressed'); }}>
            <Ionicons name="trophy-outline" size={20} color="#000" style={styles.menuIcon} />
            <ThemedText style={styles.menuText}>Le Mie Gare</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); console.log('Cookie preferiti pressed'); }}>
            <Ionicons name="heart-outline" size={20} color="#000" style={styles.menuIcon} />
            <ThemedText style={styles.menuText}>Cookie preferiti</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); console.log('Lista delle gare pressed'); }}>
            <Ionicons name="list-outline" size={20} color="#000" style={styles.menuIcon} />
            <ThemedText style={styles.menuText}>Lista delle gare</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); console.log('Passa alla Run pressed'); }}>
            <Ionicons name="play-outline" size={20} color="#000" style={styles.menuIcon} />
            <ThemedText style={styles.menuText}>Passa alla Run</ThemedText>
          </TouchableOpacity>

          <View style={styles.comingSoonItem}>
            <Ionicons name="podium-outline" size={20} color="#666" style={styles.menuIcon} />
            <ThemedText style={styles.comingSoonText}>Classifiche</ThemedText>
          </View>

          <View style={styles.comingSoonItem}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.menuIcon} />
            <ThemedText style={styles.comingSoonText}>Il mio profilo</ThemedText>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280, // Leggermente più larga per modernità
    backgroundColor: '#FFD700', // Giallo dell'header
    paddingTop: 50,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  logo: {
    height: 35,
    width: 80,
  },
  closeButton: {
    padding: 5,
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#FFD700',
    marginVertical: 20,
    marginHorizontal: 10,
  },
  comingSoonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Più trasparente
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Meno ombra
    shadowRadius: 2,
    elevation: 1, // Meno elevazione
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666', // Grigio
    fontWeight: '500',
  },
});