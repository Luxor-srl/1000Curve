import { Ionicons } from '@expo/vector-icons'; // Assicurati di avere installato @expo/vector-icons
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RaceHeaderProps {
  pilotName: string;
  onSidebarPress: () => void;
}

const RaceHeader: React.FC<RaceHeaderProps> = ({ pilotName, onSidebarPress }) => {
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700; // Consideriamo piccoli gli schermi sotto i 700px
  
  const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.headerContainer, isSmallScreen && styles.headerContainerSmall]}>
      <TouchableOpacity onPress={onSidebarPress} style={styles.sidebarIcon}>
        <Ionicons name="menu" size={isSmallScreen ? 26 : 30} color="black" />
      </TouchableOpacity>
      <Image
        source={require('@/assets/images/logo-mille-dark.png')}
        style={[styles.logo, isSmallScreen && styles.logoSmall]}
        resizeMode="contain"
      />
      <View style={styles.pilotInfoContainer}>
        <Text style={[styles.pilotName, isSmallScreen && styles.pilotNameSmall]}>{pilotName}</Text>
        <View style={[styles.profileInitialContainer, isSmallScreen && styles.profileInitialContainerSmall]}>
          <Text style={[styles.profileInitial, isSmallScreen && styles.profileInitialSmall]}>{getInitials(pilotName)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFD700',
    paddingHorizontal: 15,
    paddingTop: 40, // Aggiunto padding superiore per la notch
    paddingBottom: 10, // Mantenuto padding inferiore
    height: 115, // Altezza aumentata
  },
  headerContainerSmall: {
    paddingTop: 35,
    paddingBottom: 8,
    height: 95, // Altezza ridotta per schermi piccoli
  },
  sidebarIcon: {
    padding: 5,
  },
  logo: {
    height: 40,
    width: 100, // Adatta in base alle dimensioni del tuo logo
    marginLeft: 10,
  },
  logoSmall: {
    height: 32,
    width: 80,
  },
  pilotInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pilotName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    marginRight: 10,
  },
  pilotNameSmall: {
    fontSize: 14,
    marginRight: 8,
  },
  profileInitialContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'black', // Colore di sfondo per le iniziali
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialContainerSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  profileInitial: {
    color: '#FFD700', // Colore delle iniziali
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileInitialSmall: {
    fontSize: 12,
  },
});

export default RaceHeader;
