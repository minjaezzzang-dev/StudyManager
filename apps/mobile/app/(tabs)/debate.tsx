import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function DebateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>토론 (F3)</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text>토론 화면 구현 예정</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});