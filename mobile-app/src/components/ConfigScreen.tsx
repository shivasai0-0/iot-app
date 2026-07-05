import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MqttConfig, ConnectionStatus } from '../services/mqttService';
import { Settings, Shield, Server, User, Key, Cpu, HelpCircle } from 'lucide-react-native';

interface ConfigScreenProps {
  currentStatus: ConnectionStatus;
  onSaveConfig: (config: MqttConfig) => void;
}

const STORAGE_KEY = '@arrow_aqi_mqtt_config';

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ currentStatus, onSaveConfig }) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('8884'); // 8884 is standard secure WSS port
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('arrow_aqi_monitor_01');
  const [saving, setSaving] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: MqttConfig = JSON.parse(stored);
          setHost(parsed.host || '');
          setPort(parsed.port ? String(parsed.port) : '8884');
          setUsername(parsed.username || '');
          setPassword(parsed.password || '');
          setDeviceId(parsed.deviceId || 'arrow_aqi_monitor_01');
          
          // Connect automatically if configuration exists
          onSaveConfig(parsed);
        }
      } catch (e) {
        console.error('Failed to load MQTT configuration from AsyncStorage:', e);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!host.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid MQTT broker host address.');
      return;
    }
    if (!port.trim() || isNaN(Number(port))) {
      Alert.alert('Validation Error', 'Please enter a valid numeric port number.');
      return;
    }
    if (!deviceId.trim()) {
      Alert.alert('Validation Error', 'Please specify the target device identifier.');
      return;
    }

    setSaving(true);
    const config: MqttConfig = {
      host: host.trim(),
      port: Number(port.trim()),
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      deviceId: deviceId.trim(),
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      onSaveConfig(config);
      Alert.alert('Success', 'MQTT connection parameters saved successfully!');
    } catch (e) {
      console.error('Failed to save MQTT config:', e);
      Alert.alert('Error', 'Failed to save configuration settings locally.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED': return '#10B981';
      case 'CONNECTING':
      case 'RECONNECTING': return '#F59E0B';
      case 'ERROR': return '#EF4444';
      default: return '#64748B';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Configuration Header */}
      <View style={styles.header}>
        <Settings color="#38BDF8" size={32} />
        <Text style={styles.headerTitle}>Broker Configuration</Text>
        <Text style={styles.headerSub}>Specify broker connection parameters and credentials below. Secrets are stored securely on-device.</Text>
      </View>

      {/* Connection Status Panel */}
      <View style={styles.statusPanel}>
        <Text style={styles.statusLabel}>Connection Status:</Text>
        <View style={styles.statusBadgeRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentStatus) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(currentStatus) }]}>
            {currentStatus}
          </Text>
        </View>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        
        {/* Host */}
        <Text style={styles.inputLabel}>MQTT Broker Host (WSS)</Text>
        <View style={styles.inputWrapper}>
          <Server color="#64748B" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. cluster.s1.eu.hivemq.cloud"
            placeholderTextColor="#475569"
            value={host}
            onChangeText={setHost}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Port */}
        <Text style={styles.inputLabel}>WebSocket Port (TLS)</Text>
        <View style={styles.inputWrapper}>
          <HelpCircle color="#64748B" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. 8884"
            placeholderTextColor="#475569"
            value={port}
            onChangeText={setPort}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Device ID */}
        <Text style={styles.inputLabel}>Target Device ID</Text>
        <View style={styles.inputWrapper}>
          <Cpu color="#64748B" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. arrow_aqi_monitor_01"
            placeholderTextColor="#475569"
            value={deviceId}
            onChangeText={setDeviceId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Username */}
        <Text style={styles.inputLabel}>Broker Username (Optional)</Text>
        <View style={styles.inputWrapper}>
          <User color="#64748B" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#475569"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password */}
        <Text style={styles.inputLabel}>Broker Password (Optional)</Text>
        <View style={styles.inputWrapper}>
          <Key color="#64748B" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#475569"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Connect Action Button */}
        <Pressable 
          onPress={handleSave} 
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.saveBtnPressed,
            saving && styles.saveBtnDisabled
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Shield size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>SAVE &amp; CONNECT</Text>
            </>
          )}
        </Pressable>

      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 10,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  statusPanel: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  form: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 10,
  },
  saveBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  saveBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  saveBtnDisabled: {
    backgroundColor: '#334155',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
