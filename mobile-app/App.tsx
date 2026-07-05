import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  mqttService, 
  TelemetryData, 
  OccupancyData, 
  RelayData, 
  ConnectionStatus,
  MqttConfig 
} from './src/services/mqttService';
import { Dashboard } from './src/components/Dashboard';
import { OccupancyCard } from './src/components/OccupancyCard';
import { RelayCard } from './src/components/RelayCard';
import { ConfigScreen } from './src/components/ConfigScreen';
import { Activity, User, Lightbulb, Settings, WifiOff } from 'lucide-react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'occupancy' | 'relay' | 'config'>('config');
  const [mqttStatus, setMqttStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [deviceStatus, setDeviceStatus] = useState<'online' | 'offline'>('offline');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null);
  const [relay, setRelay] = useState<RelayData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveConfig = (newConfig: MqttConfig) => {
    setErrorMsg(null);
    mqttService.configure(newConfig);
    mqttService.connect(
      (status) => {
        setMqttStatus(status);
        if (status === 'CONNECTED') {
          // If we successfully connect to the broker, automatically navigate to the Dashboard tab
          setActiveTab('dashboard');
        }
      },
      (err) => {
        setErrorMsg(err);
      },
      (telemetryData) => {
        setTelemetry(telemetryData);
      },
      (occupancyData) => {
        setOccupancy(occupancyData);
      },
      (relayData) => {
        setRelay(relayData);
      },
      (deviceOnline) => {
        setDeviceStatus(deviceOnline);
      }
    );
  };

  // Disconnect MQTT on app unmount
  useEffect(() => {
    return () => {
      mqttService.disconnect();
    };
  }, []);

  const getStatusBadge = () => {
    if (mqttStatus !== 'CONNECTED') {
      return (
        <View style={[styles.statusBadge, styles.badgeConnecting]}>
          <Text style={styles.badgeTextSmall}>{mqttStatus}</Text>
        </View>
      );
    }
    
    // Broker is connected, check if target hardware device is active
    if (deviceStatus === 'online') {
      return (
        <View style={[styles.statusBadge, styles.badgeOnline]}>
          <Text style={styles.badgeTextSmall}>DEVICE ONLINE</Text>
        </View>
      );
    }

    return (
      <View style={[styles.statusBadge, styles.badgeOffline]}>
        <Text style={styles.badgeTextSmall}>DEVICE OFFLINE</Text>
      </View>
    );
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            telemetry={telemetry} 
            deviceOnline={mqttStatus === 'CONNECTED' && deviceStatus === 'online'}
            deviceStatus={deviceStatus}
          />
        );
      case 'occupancy':
        return <OccupancyCard occupancy={occupancy} />;
      case 'relay':
        return <RelayCard relay={relay} />;
      case 'config':
        return (
          <ConfigScreen 
            currentStatus={mqttStatus} 
            onSaveConfig={handleSaveConfig} 
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Application Top Bar Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ARROW AQI</Text>
          <Text style={styles.headerSubtitle}>Monitor &amp; Control</Text>
        </View>
        {getStatusBadge()}
      </View>

      {/* Error message strip */}
      {errorMsg && (
        <View style={styles.errorStrip}>
          <WifiOff color="#EF4444" size={16} />
          <Text style={styles.errorText} numberOfLines={1}>
            Connection Error: {errorMsg}
          </Text>
        </View>
      )}

      {/* Core Screen Body */}
      <View style={styles.screenContent}>
        {renderActiveScreen()}
      </View>

      {/* Bottom Tab Navigation Bar */}
      <View style={styles.tabBar}>
        
        <Pressable 
          onPress={() => setActiveTab('dashboard')} 
          style={styles.tabItem}
        >
          <Activity 
            color={activeTab === 'dashboard' ? '#38BDF8' : '#64748B'} 
            size={24} 
          />
          <Text style={[styles.tabLabel, activeTab === 'dashboard' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            Dashboard
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('occupancy')} 
          style={styles.tabItem}
        >
          <User 
            color={activeTab === 'occupancy' ? '#38BDF8' : '#64748B'} 
            size={24} 
          />
          <Text style={[styles.tabLabel, activeTab === 'occupancy' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            Occupancy
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('relay')} 
          style={styles.tabItem}
        >
          <Lightbulb 
            color={activeTab === 'relay' ? '#38BDF8' : '#64748B'} 
            size={24} 
          />
          <Text style={[styles.tabLabel, activeTab === 'relay' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            AC Bulb
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('config')} 
          style={styles.tabItem}
        >
          <Settings 
            color={activeTab === 'config' ? '#38BDF8' : '#64748B'} 
            size={24} 
          />
          <Text style={[styles.tabLabel, activeTab === 'config' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            Settings
          </Text>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeConnecting: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  errorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#38BDF8',
  },
  tabLabelInactive: {
    color: '#64748B',
  },
});
