import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useThemeColor } from '@/hooks/useThemeColor';
import { OffRunUserData, RacerData, saveAuthData, saveOffRunAuthData } from '@/utils/auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
// Import the necessary icons
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [todayRace, setTodayRace] = useState<any>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mode, setMode] = useState<'off-run' | 'run'>('off-run'); // Stato per lo slider Off-Run / Run
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [mobile, setMobile] = useState('');
  const [address1, setAddress1] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [zone, setZone] = useState('');
  const [country, setCountry] = useState('');
    // Registration form state (multi-step)
    const [registerStep, setRegisterStep] = useState<number>(0); // 0: account, 1: personal, 2: address, 3: review
  const [showPassword, setShowPassword] = useState(false); // Stato per mostrare/nascondere password
  const [errors, setErrors] = useState<{[key: string]: string}>({}); // Stati per errori di validazione

  const router = useRouter();
  const { location, enabled, errorMsg } = useLiveLocation();

  // Stampa in console le coordinate ogni volta che cambiano
  React.useEffect(() => {
    if (location) {
      const timestamp = new Date().toLocaleTimeString();
      const deviceName = Device.deviceName || 'Dispositivo sconosciuto';
      console.log(`[${timestamp}] ${deviceName} - Coordinate attuali:`, location.latitude, location.longitude);
    }
  }, [location]);
  const iconColor = useThemeColor({}, 'tint');

  // Recupera tutte le gare disponibili all'avvio
  React.useEffect(() => {
    const fetchRaces = async () => {
      setLoadingRace(true);
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
      };
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRaces',
      });
      const url = `https://crm.1000curve.com/Race?${params.toString()}`;
      try {
        const res = await fetch(url, { method: 'GET', headers });
        const data = await res.json();
        if (data && Array.isArray(data.races)) {
          // Logga tutte le tappe con le date di inizio
          console.log('Lista tappe e date di inizio:');
          data.races.forEach((race: any) => {
            console.log(`- ${race.name} (${race.slug}): ${race.startDateDisplayTimestamp}`);
          });
          // Trova la gara di oggi ESATTAMENTE
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const found = data.races.find((race: any) => {
            const start = new Date(race.startDateGmtDate);
            start.setHours(0, 0, 0, 0);
            return start.getTime() === today.getTime();
          });
          
          console.log('Gara di oggi trovata:', found ? found.name : 'Nessuna gara oggi');
          setTodayRace(found || null);
        } else {
          setTodayRace(null);
        }
      } catch (e) {
        console.error('Errore nel caricamento gare:', e);
        setTodayRace(null);
      }
      setLoadingRace(false);
    };
    fetchRaces();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return; // Previene doppi click
    
    console.log(`Tentativo di login in modalità: ${mode}`);
    
    if (mode === 'run') {
      // Flusso Run esistente
      if (!enabled) {
        Alert.alert('Geolocalizzazione richiesta', 'Attiva la geolocalizzazione per effettuare il login.');
        return;
      }
      if (!todayRace) {
        Alert.alert('Errore', 'Nessuna gara disponibile oggi. Controlla che ci sia una gara in programma per oggi.');
        return;
      }
      
      setIsLoggingIn(true);
      
      const email = username;
      const number = password;
      const raceSlug = todayRace.slug;
      try {
        // Chiamata dummy a CRMRaceLog per inizializzare la sessione
        try {
          const dummyParams = new URLSearchParams({
            action: 'get',
            getAction: 'getRacerLocationTime',
            racerId: '0',
            clientId: '0',
            raceLocationCode: 'dummy',
          });
          const dummyUrl = `https://crm.1000curve.com/CRMRaceLog?${dummyParams.toString()}`;
          const dummyHeaders = {
            'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
          };
          await fetch(dummyUrl, { method: 'GET', headers: dummyHeaders, credentials: 'include' });
          console.log('Chiamata dummy CRMRaceLog eseguita');
        } catch (e) {
          console.warn('Chiamata dummy CRMRaceLog fallita', e);
        }
        // 1. Chiamata a /Racer per startRaceSession
        const paramsRacer = new URLSearchParams({
          action: 'set',
          setAction: 'startRaceSession',
          email,
          number,
          raceSlug,
        });
        const urlRacer = `https://crm.1000curve.com/Racer?${paramsRacer.toString()}`;
        const headers = {
          'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        };
        console.log('Chiamata API /Racer:', { urlRacer, method: 'GET', headers });
        const responseRacer = await fetch(urlRacer, { method: 'GET', headers });
        let textRacer = await responseRacer.text();
        let dataRacer;
        try {
          dataRacer = textRacer ? JSON.parse(textRacer) : null;
        } catch (parseError) {
          console.error('Errore di parsing JSON /Racer:', parseError, 'Risposta ricevuta:', textRacer);
          dataRacer = { error: 'Risposta non in formato JSON', raw: textRacer };
        }
        if (!dataRacer || !dataRacer.id || !dataRacer.clientId) {
          Alert.alert('Errore', 'Email o numero pettorale non validi. Verifica i dati inseriti.');
          return;
        }
        // Salva i dati del racer per uso futuro
        const racerData: RacerData = {
          racerid: dataRacer.id,
          number: dataRacer.number,
          racerclientid: dataRacer.clientId,
          raceslug: raceSlug,
          email,
        };

        // 2. Chiamata a /Race per ottenere i dati della gara
        const paramsRace = new URLSearchParams({
          action: 'get',
          getAction: 'getRace',
          slug: raceSlug,
        });
        const urlRace = `https://crm.1000curve.com/Race?${paramsRace.toString()}`;
        console.log('Chiamata API /Race:', { urlRace, method: 'GET', headers });
        const responseRace = await fetch(urlRace, { method: 'GET', headers });
        let textRace = await responseRace.text();
        let dataRace;
        try {
          dataRace = textRace ? JSON.parse(textRace) : null;
        } catch (parseError) {
          console.error('Errore di parsing JSON /Race:', parseError, 'Risposta ricevuta:', textRace);
          dataRace = { error: 'Risposta non in formato JSON', raw: textRace };
        }

        // Salva i dati di autenticazione
        await saveAuthData(racerData, dataRace);

        // Naviga alla pagina race passando i dati della gara come parametro
        router.replace({
          pathname: '/race',
          params: {
            raceData: encodeURIComponent(JSON.stringify(dataRace)),
          },
        });
      } catch (error) {
        // Stampa il motivo dell'errore in console
        console.error('Errore durante la chiamata API:', error);
        Alert.alert('Errore', 'Errore durante il login o la chiamata API.');
      } finally {
        setIsLoggingIn(false);
      }
    } else if (mode === 'off-run') {
      // Flusso Off-Run
      setIsLoggingIn(true);
      try {
        const params = new URLSearchParams({
          action: 'raceUserValid',
          username,
          password,
        });
        const url = `https://crm.1000curve.com/RaceUser?${params.toString()}`;
        const headers = {
          'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
          'Content-Type': 'application/x-www-form-urlencoded',
        };
        console.log('Chiamata API /RaceUser:', { url, method: 'POST', headers, body: params.toString() });
        const response = await fetch(url, { method: 'POST', headers, body: params.toString() });
        let text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseError) {
          console.error('Errore di parsing JSON /RaceUser:', parseError, 'Risposta ricevuta:', text);
          data = { error: 'Risposta non in formato JSON', raw: text };
        }
        console.log('Risposta API /RaceUser:', data);
        if (data && data.valid === true) {
          // Salva i dati dell'utente Off-Run in AsyncStorage
          const userData: OffRunUserData = {
            email: username,
            username: data.username || username,
            firstname: data.firstname || '',
            lastname: data.lastname || '',
          };
          await saveOffRunAuthData(userData);
          
          // Naviga alla pagina off-run
          router.replace('/off-run');
        } else {
          const message = data && data.message ? data.message : 'Credenziali non valide.';
          Alert.alert('Errore', message);
        }
      } catch (error) {
        console.error('Errore durante la chiamata API Off-Run:', error);
        Alert.alert('Errore', 'Errore durante il login Off-Run.');
      } finally {
        setIsLoggingIn(false);
      }
    }
  };  const handleRegister = () => {
    console.log('Apertura modal registrazione');
    setRegisterStep(0);
    setShowRegisterModal(true);
  };

  const handleSubmitRegister = async () => {
    // Validazione campi
    if (!regUsername || !regPassword || !firstname || !lastname || !mobile || !address1 || !municipality || !zone || !country) {
      Alert.alert('Errore', 'Tutti i campi sono obbligatori.');
      return;
    }

    try {
      const params = new URLSearchParams({
        action: 'register',
        username: regUsername,
        password: regPassword,
        firstname,
        lastname,
        mobile,
        address1,
        municipality,
        zone,
        country,
      });
      const url = `https://crm.1000curve.com/RaceUser?${params.toString()}`;
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      console.log('Chiamata API registrazione /RaceUser:', { url, method: 'POST', headers, body: params.toString() });
      const response = await fetch(url, { method: 'POST', headers, body: params.toString() });
      let text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseError) {
        console.error('Errore di parsing JSON registrazione:', parseError, 'Risposta ricevuta:', text);
        data = { error: 'Risposta non in formato JSON', raw: text };
      }
      console.log('Risposta API registrazione:', data);
      if (data && data.username) {
        Alert.alert('Successo', 'Registrazione completata con successo!');
        setShowRegisterModal(false);
        // Reset campi
        setRegUsername('');
        setRegPassword('');
        setFirstname('');
        setLastname('');
        setMobile('');
        setAddress1('');
        setMunicipality('');
        setZone('');
        setCountry('');
      } else {
        Alert.alert('Errore', 'Registrazione fallita. Riprova.');
      }
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      Alert.alert('Errore', 'Errore durante la registrazione.');
    }
  };

  const goToNextStep = () => {
    const next = Math.min(registerStep + 1, 3);
    setRegisterStep(next);
    Haptics.selectionAsync();
    console.log('Step registrazione:', next);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: {[key: string]: string} = {};
    if (step === 0) {
      if (!regUsername) {
        newErrors.regUsername = 'Email obbligatoria';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regUsername)) {
        newErrors.regUsername = 'Email non valida';
      }
      if (!regPassword) {
        newErrors.regPassword = 'Password obbligatoria';
      } else if (regPassword.length < 6) {
        newErrors.regPassword = 'Password deve essere almeno 6 caratteri';
      }
    } else if (step === 1) {
      if (!firstname.trim()) newErrors.firstname = 'Nome obbligatorio';
      if (!lastname.trim()) newErrors.lastname = 'Cognome obbligatorio';
      if (!mobile.trim()) {
        newErrors.mobile = 'Telefono obbligatorio';
      } else if (!/^\d{10,15}$/.test(mobile.replace(/\s/g, ''))) {
        newErrors.mobile = 'Telefono non valido (solo numeri, 10-15 cifre)';
      }
    } else if (step === 2) {
      if (!address1.trim()) newErrors.address1 = 'Indirizzo obbligatorio';
      if (!municipality.trim()) newErrors.municipality = 'Comune obbligatorio';
      if (!zone.trim()) newErrors.zone = 'Provincia obbligatoria';
      if (!country.trim()) newErrors.country = 'Paese obbligatorio';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToNextStepValidated = () => {
    if (validateStep(registerStep)) {
      const next = Math.min(registerStep + 1, 3);
      setRegisterStep(next);
      Haptics.selectionAsync();
      console.log('Step registrazione:', next);
    }
  };

  const goToPrevStep = () => {
    const prev = Math.max(registerStep - 1, 0);
    setRegisterStep(prev);
    Haptics.selectionAsync();
    console.log('Step registrazione:', prev);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Immagine in alto */}
      <View style={styles.topImageContainer}>
        <Image
          source={require('../assets/images/1000curve-login.jpg')}
          style={styles.topImage}
          resizeMode="cover"
        />
      </View>
      {/* Drawer in basso */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.drawerContainer}
      >
        {/* Slider Off-Run / Run */}
        <View style={styles.sliderContainer}>
          <TouchableOpacity style={[styles.sliderOption, mode === 'off-run' && styles.sliderSelected]} onPress={() => { setMode('off-run'); console.log('Modalità selezionata: Off-Run'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }} activeOpacity={0.85}>
            <ThemedText style={[styles.sliderText, mode === 'off-run' && styles.sliderTextSelected]} allowFontScaling={false}>Off-Run</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sliderOption, mode === 'run' && styles.sliderSelected]} onPress={() => { setMode('run'); console.log('Modalità selezionata: Run'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }} activeOpacity={0.85}>
            <ThemedText style={[styles.sliderText, mode === 'run' && styles.sliderTextSelected]} allowFontScaling={false}>Run</ThemedText>
          </TouchableOpacity>
        </View>
        {/* Input e info gara */}
        <View style={styles.inputsContainer}>
          <View style={styles.inputWrapper}>
            <View style={styles.letterIcon}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#888" />
            </View>
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Email"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>
          <View style={styles.inputWrapper}>
            <View style={styles.letterIcon}>
              {mode === 'run' ? <FontAwesome name="id-card-o" size={18} color="#888" /> : <FontAwesome name="lock" size={18} color="#888" />}
            </View>
            <TextInput
              style={styles.inputWithIcon}
              placeholder={mode === 'run' ? "Numero pettorale" : "Password"}
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              keyboardType={mode === 'run' ? "numeric" : "default"}
              secureTextEntry={mode === 'off-run'}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>
          {mode === 'run' && (
            <ThemedText style={styles.raceNameText} allowFontScaling={false}>
              {loadingRace ? 'Caricamento gara...' : (todayRace ? todayRace.name : 'Nessuna gara oggi')}
            </ThemedText>
          )}
        </View>
        {/* Pulsante Accedi */}
        <TouchableOpacity
          style={[styles.loginButton, (!enabled || isLoggingIn) && { opacity: 0.5 }]}
          onPress={handleLogin}
          disabled={!enabled || isLoggingIn}
        >
          <ThemedText style={styles.loginButtonText} allowFontScaling={false}>
            {isLoggingIn ? 'Accesso in corso...' : 'Accedi'}
          </ThemedText>
        </TouchableOpacity>
        {/* Pulsante Registrati per Off-Run */}
        {mode === 'off-run' && (
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <ThemedText style={styles.registerButtonText} allowFontScaling={false}>Registrati</ThemedText>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
      {/* Modal Registrazione */}
      <Modal
        visible={showRegisterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRegisterModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="always">
            <ThemedText style={styles.modalTitle} allowFontScaling={false}>Registrazione Off-Run</ThemedText>
            {/* Step indicator */}
            <View style={styles.stepperContainer}>
              {['Account', 'Personale', 'Indirizzo', 'Riepilogo'].map((label, idx) => (
                <View key={label} style={styles.stepItem}>
                  <View style={[styles.stepCircle, registerStep === idx && styles.stepCircleActive]}>
                    <ThemedText style={[styles.stepNumber, registerStep === idx && styles.stepNumberActive]}>{idx + 1}</ThemedText>
                  </View>
                  <ThemedText style={[styles.stepLabel, registerStep === idx && styles.stepLabelActive]}>{label}</ThemedText>
                </View>
              ))}
            </View>

            {/* Step content */}
            <View style={styles.modalInputsContainer}>
              {registerStep === 0 && (
                <>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Email"
                    placeholderTextColor="#888"
                    value={regUsername}
                    onChangeText={setRegUsername}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoFocus={true}
                  />
                  {errors.regUsername && <ThemedText style={styles.errorText}>{errors.regUsername}</ThemedText>}
                  <View style={styles.modalInputWithIcon}>
                    <TextInput
                      style={styles.modalInputText}
                      placeholder="Password"
                      placeholderTextColor="#888"
                      value={regPassword}
                      onChangeText={setRegPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <FontAwesome name={showPassword ? "eye-slash" : "eye"} size={20} color="#888" />
                    </TouchableOpacity>
                  </View>
                  {errors.regPassword && <ThemedText style={styles.errorText}>{errors.regPassword}</ThemedText>}
                </>
              )}
              {registerStep === 1 && (
                <>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nome"
                    placeholderTextColor="#888"
                    value={firstname}
                    onChangeText={setFirstname}
                    autoFocus={true}
                  />
                  {errors.firstname && <ThemedText style={styles.errorText}>{errors.firstname}</ThemedText>}
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Cognome"
                    placeholderTextColor="#888"
                    value={lastname}
                    onChangeText={setLastname}
                  />
                  {errors.lastname && <ThemedText style={styles.errorText}>{errors.lastname}</ThemedText>}
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Telefono"
                    placeholderTextColor="#888"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                  />
                  {errors.mobile && <ThemedText style={styles.errorText}>{errors.mobile}</ThemedText>}
                </>
              )}
              {registerStep === 2 && (
                <>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Indirizzo"
                    placeholderTextColor="#888"
                    value={address1}
                    onChangeText={setAddress1}
                    autoFocus={true}
                  />
                  {errors.address1 && <ThemedText style={styles.errorText}>{errors.address1}</ThemedText>}
                  <View style={styles.modalInputRow}>
                    <TextInput
                      style={[styles.modalInput, styles.modalInputHalf]}
                      placeholder="Comune"
                      placeholderTextColor="#888"
                      value={municipality}
                      onChangeText={setMunicipality}
                    />
                    <TextInput
                      style={[styles.modalInput, styles.modalInputHalf]}
                      placeholder="Provincia"
                      placeholderTextColor="#888"
                      value={zone}
                      onChangeText={setZone}
                    />
                  </View>
                  {errors.municipality && <ThemedText style={styles.errorText}>{errors.municipality}</ThemedText>}
                  {errors.zone && <ThemedText style={styles.errorText}>{errors.zone}</ThemedText>}
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Paese"
                    placeholderTextColor="#888"
                    value={country}
                    onChangeText={setCountry}
                  />
                  {errors.country && <ThemedText style={styles.errorText}>{errors.country}</ThemedText>}
                </>
              )}
              {registerStep === 3 && (
                <View style={{ width: '100%', maxWidth: 340 }}>
                  <View style={styles.reviewCard}>
                    <MaterialCommunityIcons name="email-outline" size={24} color="#FFD700" />
                    <View style={styles.reviewCardContent}>
                      <ThemedText style={styles.reviewCardLabel}>Email</ThemedText>
                      <ThemedText style={styles.reviewCardValue}>{regUsername}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.reviewCard}>
                    <FontAwesome name="user" size={24} color="#FFD700" />
                    <View style={styles.reviewCardContent}>
                      <ThemedText style={styles.reviewCardLabel}>Nome Completo</ThemedText>
                      <ThemedText style={styles.reviewCardValue}>{firstname} {lastname}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.reviewCard}>
                    <FontAwesome name="phone" size={24} color="#FFD700" />
                    <View style={styles.reviewCardContent}>
                      <ThemedText style={styles.reviewCardLabel}>Telefono</ThemedText>
                      <ThemedText style={styles.reviewCardValue}>{mobile}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.reviewCard}>
                    <FontAwesome name="map-marker" size={24} color="#FFD700" />
                    <View style={styles.reviewCardContent}>
                      <ThemedText style={styles.reviewCardLabel}>Indirizzo</ThemedText>
                      <ThemedText style={styles.reviewCardValue}>{address1}, {municipality} ({zone}) - {country}</ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Navigation buttons */}
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalCancelButton, registerStep === 0 && { opacity: 0.8 }]}
                onPress={() => {
                  if (registerStep === 0) setShowRegisterModal(false);
                  else goToPrevStep();
                }}
              >
                <ThemedText style={styles.modalCancelButtonText} allowFontScaling={false}>{registerStep === 0 ? 'Annulla' : 'Indietro'}</ThemedText>
              </TouchableOpacity>
              {registerStep < 3 ? (
                <TouchableOpacity
                  style={styles.modalRegisterButton}
                  onPress={goToNextStepValidated}
                >
                  <ThemedText style={styles.modalRegisterButtonText} allowFontScaling={false}>Avanti</ThemedText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.modalRegisterButton}
                  onPress={handleSubmitRegister}
                >
                  <ThemedText style={styles.modalRegisterButtonText} allowFontScaling={false}>Registra</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  topImageContainer: {
    width: '100%',
    height: '45%',
    minHeight: 220,
    maxHeight: 400,
    overflow: 'hidden',
    position: 'relative',
  },
  topImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawerContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f8f8',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    minHeight: '65%',
    maxHeight: '75%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  roundedBox: {
    backgroundColor: '#FFD700',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  roundedBoxText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    letterSpacing: 0.5,
  },
  inputsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  letterIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  letterIconText: {
    fontSize: 18,
    color: '#888',
    fontWeight: '700',
  },
  inputWithIcon: {
    flex: 1,
    height: 54,
    fontSize: 18,
    color: '#222',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
  },
  raceNameText: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
    marginBottom: 0,
    textAlign: 'center',
  },
  loginButton: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FBBA00',
    paddingVertical: 26,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
    overflow: 'visible',
  },
  loginButtonText: {
    color: '#111',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sliderContainer: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 32,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sliderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderSelected: {
    backgroundColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  sliderTextSelected: {
    color: '#222',
  },
  registerButton: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FBBA00',
    paddingVertical: 26,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
    overflow: 'visible',
  },
  registerButtonText: {
    color: '#111',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 32,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalInputsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalInput: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#222',
    marginBottom: 16,
  },
  modalInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
    marginBottom: 16,
  },
  modalInputHalf: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 0,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 20,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  modalRegisterButton: {
    flex: 1,
    backgroundColor: '#FBBA00',
    paddingVertical: 20,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalRegisterButtonText: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
    marginBottom: 20,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: '#FFD700',
  },
  stepNumber: {
    color: '#666',
    fontWeight: '700',
  },
  stepNumberActive: {
    color: '#222',
  },
  stepLabel: {
    fontSize: 10,
    color: '#888',
  },
  stepLabelActive: {
    color: '#222',
    fontWeight: '600',
  },
  reviewText: {
    fontSize: 16,
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  reviewCardLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reviewCardValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginTop: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    marginTop: -12,
    marginBottom: 16,
    textAlign: 'left',
    width: '100%',
    maxWidth: 340,
  },
  modalInputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  modalInputText: {
    flex: 1,
    fontSize: 18,
    color: '#222',
  },
  eyeIcon: {
    marginLeft: 8,
  },
});
