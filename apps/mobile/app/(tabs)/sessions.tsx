import { View, Text, StyleSheet } from 'react-native';

export default function SessionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sessions</Text>
      <Text style={styles.subtitle}>Arcade session history coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f9fafb' },
  subtitle: { marginTop: 8, color: '#6b7280' },
});
