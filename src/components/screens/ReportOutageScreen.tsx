import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';

export default function ReportOutageScreen() {
  const { colors } = useTheme();

  const callKplc = async () => {
    const phoneNumber = 'tel:+2540203201000';
    if (await Linking.canOpenURL(phoneNumber)) {
      await Linking.openURL(phoneNumber);
      return;
    }
    Alert.alert('Phone calls unavailable', 'This device cannot open the phone dialer.');
  };

  const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.background },
    content: { alignItems: 'center' },
    title: { color: colors.foreground, fontSize: 23, fontWeight: '700', marginTop: 18, textAlign: 'center' },
    body: { color: colors.mutedForeground, fontSize: 15, lineHeight: 22, marginVertical: 14, textAlign: 'center' },
    button: { alignSelf: 'stretch', marginTop: 8 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Icon name="send" size={44} color={colors.emergencyWarning} />
        <Text style={styles.title}>In-app reporting is not available yet</Text>
        <Text style={styles.body}>
          The reporting database and moderation policies have not been deployed. StimaSense will not display a false success message or treat an unverified report as a confirmed outage.
        </Text>
      </View>
      <Button title="Call Kenya Power" style={styles.button} onPress={callKplc} />
    </SafeAreaView>
  );
}
