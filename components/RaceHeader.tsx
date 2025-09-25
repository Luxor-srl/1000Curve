import { Ionicons } from '@expo/vector-icons'; // Assicurati di avere installato @expo/vector-icons
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RaceHeaderProps {
  pilotName: string;
  onSidebarPress: () => void;
  onLogoutPress: () => void;
  showSidebarButton?: boolean;
}

const RaceHeader: React.FC<RaceHeaderProps> = ({ pilotName, onSidebarPress, onLogoutPress, showSidebarButton = true }) => {
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700; // Consideriamo piccoli gli schermi sotto i 700px

  return (
    <View style={[styles.headerContainer, isSmallScreen && styles.headerContainerSmall]}>
      {showSidebarButton && (
        <TouchableOpacity onPress={onSidebarPress} style={styles.sidebarIcon}>
          <Ionicons name="menu" size={isSmallScreen ? 26 : 30} color="black" />
        </TouchableOpacity>
      )}
      <Image
        source={require('@/assets/images/logo-mille-dark.png')}
        style={[styles.logo, isSmallScreen && styles.logoSmall]}
        resizeMode="contain"
      />
      <View style={styles.pilotInfoContainer}>
        <Text style={[styles.pilotName, isSmallScreen && styles.pilotNameSmall]}>{pilotName}</Text>
        <TouchableOpacity 
          onPress={onLogoutPress}
          style={[styles.logoutContainer, isSmallScreen && styles.logoutContainerSmall]}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={isSmallScreen ? 20 : 24} color="#fff" />
        </TouchableOpacity>
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
  logoutContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dc3545', // Colore rosso per il logout
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutContainerSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
});

export default RaceHeader;
