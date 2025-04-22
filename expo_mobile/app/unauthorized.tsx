import { Link } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function Unauthorized() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unauthorized Access</Text>
      <Text style={styles.text}>You don't have permission to view this page</Text>
      <Link href="/" asChild>
        <Button title="Return to Home" />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 30,
  },
});