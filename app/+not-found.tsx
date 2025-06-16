import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';


export default function NotFoundScreen() {
  useEffect(() => {
    // Redirect to StartScreen
    router.replace('/StartScreen');
  }, []);
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
