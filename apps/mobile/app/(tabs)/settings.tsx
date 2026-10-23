import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { API_URL, fullSync, syncFromWebDb, getCacheStats, clearLocalData } from '../../db/sync';
import { COLORS } from '../../constants/Theme';
import { Globe, Database, Trash2, RefreshCw, Key, ShieldCheck } from 'lucide-react-native';

export default function SettingsScreen() {
  const [region, setRegion] = useState<'intl' | 'jp'>('intl');
  const [segaId, setSegaId] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState(getCacheStats());

  useEffect(() => {
    // Load existing settings from web backend
    fetch(`${API_URL}/api/settings`)
      .then(r => r.json())
      .then(d => {
        if (d.region) setRegion(d.region);
        if (d.segaId) setSegaId(d.segaId);
      })
      .catch(() => {});
  }, []);

  const refreshStats = () => {
    setStats(getCacheStats());
  };

  async function saveCredentials() {
    if (!segaId) {
      Alert.alert('Missing fields', 'Please enter your SEGA ID.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          segaId,
          segaPassword: password || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      Alert.alert('Saved', 'Account settings saved to private database.');
    } catch (e: any) {
      Alert.alert('Error', `Failed to save: ${e?.message || String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleFullSync() {
    setSyncing(true);
    try {
      const { updated, segaDown } = await fullSync();
      refreshStats();
      if (segaDown) {
        Alert.alert(
          'SEGA Offline — Synced from Cloud DB',
          `SEGA maimai NET is currently down or in maintenance. Successfully loaded data from Web App DB (Neon).`
        );
      } else {
        Alert.alert('Sync Complete', `Successfully synced ${updated} scores and refreshed database.`);
      }
    } catch (e: any) {
      Alert.alert('Sync Failed', `${e?.message || String(e)}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleWebDbSync() {
    setSyncing(true);
    try {
      const res = await syncFromWebDb();
      refreshStats();
      Alert.alert(
        'Web DB Sync Complete',
        `Loaded ${res.scoresCount} scores, ${res.recentCount} recent plays, ${res.songsCount} songs${res.profile?.name ? `, and profile (${res.profile.name})` : ''} from your Neon database.`
      );
    } catch (e: any) {
      Alert.alert('Sync Failed', `${e?.message || String(e)}`);
    } finally {
      setSyncing(false);
    }
  }

  function handleClearData() {
    Alert.alert(
      'Clear Local Cache',
      'Are you sure you want to clear all locally cached songs and score records? This does not delete data from your remote server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            clearLocalData();
            refreshStats();
            Alert.alert('Cleared', 'Local cache has been cleared.');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* SEGA Account Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Key size={18} color={COLORS.purpleLight} />
          <Text style={styles.cardTitle}>SEGA ID Account</Text>
        </View>
        <Text style={styles.cardDesc}>
          Credentials are securely stored on your private server to automate score fetching.
        </Text>

        {/* Region Selector */}
        <Text style={styles.label}>Region</Text>
        <View style={styles.regionToggle}>
          <TouchableOpacity
            style={[styles.regionBtn, region === 'intl' && styles.regionBtnActive]}
            onPress={() => setRegion('intl')}
          >
            <Globe size={14} color={region === 'intl' ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.regionBtnText, region === 'intl' && styles.regionBtnTextActive]}>
              🌏 International (INTL)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.regionBtn, region === 'jp' && styles.regionBtnActive]}
            onPress={() => setRegion('jp')}
          >
            <Text style={[styles.regionBtnText, region === 'jp' && styles.regionBtnTextActive]}>
              🇯🇵 Japan (JP)
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEGA ID Input */}
        <Text style={styles.label}>SEGA ID</Text>
        <TextInput
          style={styles.input}
          value={segaId}
          onChangeText={setSegaId}
          placeholder="your@email.com"
          placeholderTextColor={COLORS.textSubtle}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Password Input */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter new password (optional)"
          placeholderTextColor={COLORS.textSubtle}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.buttonPrimary, saving && styles.buttonDisabled]}
          onPress={saveCredentials}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ShieldCheck size={16} color="#fff" />
              <Text style={styles.buttonPrimaryText}>Save Account Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Local Storage & Cache Stats */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Database size={18} color={COLORS.cyan} />
          <Text style={styles.cardTitle}>Local SQLite Storage</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{stats.scoresCount}</Text>
            <Text style={styles.statLabel}>Scores Cached</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{stats.songsCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Songs Indexed</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{stats.recentCount}</Text>
            <Text style={styles.statLabel}>Recent Plays</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.buttonSecondary, syncing && styles.buttonDisabled]}
          onPress={handleFullSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color={COLORS.purpleLight} />
          ) : (
            <>
              <RefreshCw size={15} color={COLORS.purpleLight} />
              <Text style={styles.buttonSecondaryText}>Sync All Records (SEGA + DB)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonSecondary, syncing && styles.buttonDisabled, { borderColor: COLORS.blue }]}
          onPress={handleWebDbSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color={COLORS.blue} />
          ) : (
            <>
              <Database size={15} color={COLORS.blue} />
              <Text style={[styles.buttonSecondaryText, { color: COLORS.blue }]}>Sync with Web App DB (Neon)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
          <Trash2 size={15} color={COLORS.red} />
          <Text style={styles.dangerButtonText}>Clear Local Cache</Text>
        </TouchableOpacity>
      </View>

      {/* API Endpoint Note */}
      <Text style={styles.apiNote}>Backend Endpoint: {API_URL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  regionToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  regionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  regionBtnActive: {
    backgroundColor: COLORS.purple,
  },
  regionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  regionBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  buttonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.purpleLight + '40',
    marginBottom: 10,
  },
  buttonSecondaryText: {
    color: COLORS.purpleLight,
    fontWeight: '700',
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 14,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSubtle,
    marginTop: 2,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  dangerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.red,
  },
  apiNote: {
    fontSize: 11,
    color: COLORS.textSubtle,
    textAlign: 'center',
  },
});
