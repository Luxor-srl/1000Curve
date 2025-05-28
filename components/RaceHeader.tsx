import { Ionicons } from '@expo/vector-icons'; // Assicurati di avere installato @expo/vector-icons
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RaceHeaderProps {
  pilotName: string;
  onSidebarPress: () => void;
}

const RaceHeader: React.FC<RaceHeaderProps> = ({ pilotName, onSidebarPress }) => {
  const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={onSidebarPress} style={styles.sidebarIcon}>
        <Ionicons name="menu" size={30} color="black" />
      </TouchableOpacity>
      <Image
        source={require('@/assets/images/logo-mille-dark.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.pilotInfoContainer}>
        <Text style={styles.pilotName}>{pilotName}</Text>
        <View style={styles.profileInitialContainer}>
          <Text style={styles.profileInitial}>{getInitials(pilotName)}</Text>
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
    height: 90, // Altezza aumentata
  },
  sidebarIcon: {
    padding: 5,
  },
  logo: {
    height: 40,
    width: 100, // Adatta in base alle dimensioni del tuo logo
    marginLeft: 10,
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
  profileInitialContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'black', // Colore di sfondo per le iniziali
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#FFD700', // Colore delle iniziali
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RaceHeader;
