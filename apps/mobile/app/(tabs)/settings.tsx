import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl
  ?? process.env.EXPO_PUBLIC_API_URL
  ?? 'http://10.0.2.2:3000';

export default function SettingsScreen() {
  const [segaId, setSegaId] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function saveCredentials() {
    if (!segaId || !password) {
      Alert.alert('Missing fields', 'Please enter both your SEGA ID and password.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segaId, password }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      Alert.alert('Saved', 'Credentials saved. Tap Sync to fetch your scores.');
    } catch (e) {
      Alert.alert('Error', `Failed to save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/sync`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      Alert.alert('Sync complete', `Updated ${data.updated ?? 0} scores.`);
    } catch (e) {
      Alert.alert('Sync failed', `${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>SEGA Account</Text>
      <Text style={styles.label}>SEGA ID</Text>
      <TextInput
        style={styles.input}
        value={segaId}
        onChangeText={setSegaId}
        placeholder="your@email.com"
        placeholderTextColor="#6b7280"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor="#6b7280"
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={saveCredentials}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Save Credentials</Text>}
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Data</Text>
      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary, syncing && styles.buttonDisabled]}
        onPress={triggerSync}
        disabled={syncing}
      >
        {syncing
          ? <ActivityIndicator color="#c084fc" />
          : <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Sync Now</Text>}
      </TouchableOpacity>

      <Text style={styles.apiNote}>API: {API_URL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#111827' },
  container: { padding: 24, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f9fafb', marginBottom: 4, marginTop: 8 },
  label: { fontSize: 13, color: '#9ca3af', marginBottom: 4 },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    color: '#f9fafb',
    fontSize: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#c084fc' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  buttonTextSecondary: { color: '#c084fc' },
  divider: { height: 1, backgroundColor: '#1f2937', marginVertical: 16 },
  apiNote: { fontSize: 11, color: '#4b5563', marginTop: 24, textAlign: 'center' },
});
