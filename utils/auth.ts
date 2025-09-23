import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  RACER_DATA: 'racerData',
  RACE_DATA: 'raceData',
  OFF_RUN_USER_DATA: 'offRunUserData',
};

const API_CONFIG = {
  API_KEY: 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
  BASE_URL: 'https://crm.1000curve.com',
};

export interface RacerData {
  racerid: string;
  number: string;
  racerclientid: string;
  raceslug: string;
  email: string;
}

export interface OffRunUserData {
  email: string;
  username: string;
  firstname: string;
  lastname: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  racerData: RacerData | null;
  raceData: any | null;
}

export interface OffRunAuthState {
  isAuthenticated: boolean;
  userData: OffRunUserData | null;
}

/**
 * Salva i dati di autenticazione nell'AsyncStorage
 */
export const saveAuthData = async (racerData: RacerData, raceData: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RACER_DATA, JSON.stringify(racerData));
    await AsyncStorage.setItem(STORAGE_KEYS.RACE_DATA, JSON.stringify(raceData));
    console.log('Dati di autenticazione salvati');
  } catch (error) {
    console.error('Errore nel salvataggio dati di autenticazione:', error);
    throw error;
  }
};

/**
 * Rimuove i dati di autenticazione dall'AsyncStorage
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.RACER_DATA);
    await AsyncStorage.removeItem(STORAGE_KEYS.RACE_DATA);
    console.log('Dati di autenticazione rimossi');
  } catch (error) {
    console.error('Errore nella rimozione dati di autenticazione:', error);
    throw error;
  }
};

/**
 * Recupera i dati di autenticazione dall'AsyncStorage
 */
export const getAuthData = async (): Promise<AuthState> => {
  try {
    const [racerDataString, raceDataString] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.RACER_DATA),
      AsyncStorage.getItem(STORAGE_KEYS.RACE_DATA),
    ]);

    if (!racerDataString || !raceDataString) {
      return {
        isAuthenticated: false,
        racerData: null,
        raceData: null,
      };
    }

    const racerData: RacerData = JSON.parse(racerDataString);
    const raceData = JSON.parse(raceDataString);

    // Verifica che i dati essenziali siano presenti
    if (!racerData.racerid || !racerData.racerclientid || !racerData.raceslug) {
      return {
        isAuthenticated: false,
        racerData: null,
        raceData: null,
      };
    }

    return {
      isAuthenticated: true,
      racerData,
      raceData,
    };
  } catch (error) {
    console.error('Errore nel recupero dati di autenticazione:', error);
    return {
      isAuthenticated: false,
      racerData: null,
      raceData: null,
    };
  }
};

/**
 * Verifica se la gara è ancora valida e se è iniziata oggi
 */
export const isRaceValid = async (raceSlug: string): Promise<boolean> => {
  try {
    const headers = {
      'Api-Key': API_CONFIG.API_KEY,
    };
    const params = new URLSearchParams({
      action: 'get',
      getAction: 'getRaces',
    });
    const url = `${API_CONFIG.BASE_URL}/Race?${params.toString()}`;
    const response = await fetch(url, { method: 'GET', headers });
    const data = await response.json();

    if (data && Array.isArray(data.races)) {
      const currentRace = data.races.find((race: any) => race.slug === raceSlug);
      if (currentRace) {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const startTime = currentRace.startDateTimestamp;
        const finishTime = currentRace.finishDateTimestamp;
        const startDate = new Date(currentRace.startDateGmtDate);
        startDate.setHours(0, 0, 0, 0);
        
        console.log('=== RACE VALIDITY CHECK ===');
        console.log('Race name:', currentRace.name);
        console.log('Race start date:', currentRace.startDateGmtDate);
        console.log('Today:', today.toISOString().split('T')[0]);
        console.log('Start date matches today:', startDate.getTime() === today.getTime());
        
        // La gara è valida se:
        // 1. È iniziata oggi (confronto solo date, non orari)
        // 2. E non è finita da più di 24 ore
        const isStartedToday = startDate.getTime() === today.getTime();
        const isNotExpired = now.getTime() <= finishTime + (24 * 60 * 60 * 1000);
        
        console.log('Is started today:', isStartedToday);
        console.log('Is not expired:', isNotExpired);
        console.log('Race valid:', isStartedToday && isNotExpired);
        console.log('========================');
        
        return isStartedToday && isNotExpired;
      }
    }
    return false;
  } catch (error) {
    console.warn('Errore nel controllo validità gara:', error);
    // In caso di errore di rete, consideriamo la gara NON valida per sicurezza
    return false;
  }
};

/**
 * Verifica se l'utente è autenticato e se i dati sono ancora validi
 */
export const checkAuthStatus = async (): Promise<AuthState> => {
  const authData = await getAuthData();
  
  if (!authData.isAuthenticated || !authData.racerData) {
    return authData;
  }

  // Verifica se la gara è ancora valida
  const raceValid = await isRaceValid(authData.racerData.raceslug);
  
  if (!raceValid) {
    console.log('Gara scaduta, rimozione dati...');
    await clearAuthData();
    return {
      isAuthenticated: false,
      racerData: null,
      raceData: null,
    };
  }

  return authData;
};

/**
 * Salva i dati di autenticazione Off-Run nell'AsyncStorage
 */
export const saveOffRunAuthData = async (userData: OffRunUserData): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.OFF_RUN_USER_DATA, JSON.stringify(userData));
    console.log('Dati di autenticazione Off-Run salvati');
  } catch (error) {
    console.error('Errore nel salvataggio dati di autenticazione Off-Run:', error);
    throw error;
  }
};

/**
 * Rimuove i dati di autenticazione Off-Run dall'AsyncStorage
 */
export const clearOffRunAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.OFF_RUN_USER_DATA);
    console.log('Dati di autenticazione Off-Run rimossi');
  } catch (error) {
    console.error('Errore nella rimozione dati di autenticazione Off-Run:', error);
    throw error;
  }
};

/**
 * Recupera i dati di autenticazione Off-Run dall'AsyncStorage
 */
export const getOffRunAuthData = async (): Promise<OffRunAuthState> => {
  try {
    const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.OFF_RUN_USER_DATA);

    if (!userDataString) {
      return {
        isAuthenticated: false,
        userData: null,
      };
    }

    const userData: OffRunUserData = JSON.parse(userDataString);

    // Verifica che i dati essenziali siano presenti
    if (!userData.email || !userData.username) {
      return {
        isAuthenticated: false,
        userData: null,
      };
    }

    return {
      isAuthenticated: true,
      userData,
    };
  } catch (error) {
    console.error('Errore nel recupero dati di autenticazione Off-Run:', error);
    return {
      isAuthenticated: false,
      userData: null,
    };
  }
};

/**
 * Verifica se l'utente Off-Run è autenticato
 */
export const checkOffRunAuthStatus = async (): Promise<OffRunAuthState> => {
  const authData = await getOffRunAuthData();
  return authData;
};

/**
 * Funzione di debug per controllare lo stato attuale dell'autenticazione
 */
export const debugAuthStatus = async (): Promise<void> => {
  try {
    const authData = await getAuthData();
    console.log('=== RUN AUTH DEBUG ===');
    console.log('Is Authenticated:', authData.isAuthenticated);
    console.log('Racer Data:', authData.racerData);
    console.log('Race Data:', authData.raceData ? 'Present' : 'Not found');
    
    if (authData.racerData) {
      const isValid = await isRaceValid(authData.racerData.raceslug);
      console.log('Race Valid:', isValid);
    }
    console.log('======================');

    const offRunAuthData = await getOffRunAuthData();
    console.log('=== OFF-RUN AUTH DEBUG ===');
    console.log('Is Authenticated:', offRunAuthData.isAuthenticated);
    console.log('User Data:', offRunAuthData.userData);
    console.log('==========================');
  } catch (error) {
    console.error('Debug Auth Error:', error);
  }
};
