import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { TelemetryData } from '../services/mqttService';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Wifi, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Info 
} from 'lucide-react-native';

interface DashboardProps {
  telemetry: TelemetryData | null;
  deviceOnline: boolean;
  deviceStatus: 'online' | 'offline';
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Two columns with padding

export const Dashboard: React.FC<DashboardProps> = ({ telemetry, deviceOnline, deviceStatus }) => {
  
  const getAqiDetails = (quality: string) => {
    switch (quality) {
      case 'GOOD':
        return {
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.15)',
          description: 'Air quality is satisfactory, and air pollution poses little or no risk.',
          icon: CheckCircle2
        };
      case 'MODERATE':
        return {
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.15)',
          description: 'Air quality is acceptable. However, there may be a risk for some people.',
          icon: Info
        };
      case 'POOR':
        return {
          color: '#F97316',
          bgColor: 'rgba(249, 115, 22, 0.15)',
          description: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
          icon: AlertTriangle
        };
      case 'DANGEROUS':
        return {
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.15)',
          description: 'Health alert: everyone may experience more serious health effects.',
          icon: AlertTriangle
        };
      case 'SMOKE ALARM':
        return {
          color: '#E11D48',
          bgColor: 'rgba(225, 29, 72, 0.25)',
          description: 'CRITICAL: High gas or smoke density detected near the monitor!',
          icon: Flame
        };
      default:
        return {
          color: '#94A3B8',
          bgColor: 'rgba(148, 163, 184, 0.1)',
          description: 'No telemetry data received from the ARROW device yet.',
          icon: Info
        };
    }
  };

  const aqi = telemetry?.airQuality || 'UNKNOWN';
  const smokeAlarmActive = aqi === 'SMOKE ALARM';
  const details = getAqiDetails(aqi);
  const AqiIcon = details.icon;

  const getWifiSignalStrength = (rssi: number) => {
    if (rssi >= -50) return 'Excellent';
    if (rssi >= -70) return 'Good';
    if (rssi >= -85) return 'Fair';
    return 'Weak';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* 1. Main AQI Overview Card */}
      <View style={[styles.aqiCard, { borderColor: details.color, backgroundColor: details.bgColor }]}>
        <View style={styles.aqiHeader}>
          <Text style={styles.aqiLabel}>Air Quality Index</Text>
          <AqiIcon color={details.color} size={28} />
        </View>
        <Text style={[styles.aqiValue, { color: details.color }]}>
          {aqi}
        </Text>
        <Text style={styles.aqiDesc}>{details.description}</Text>
      </View>

      {/* 2. PM Particulates Grid */}
      <Text style={styles.sectionTitle}>Particulate Matter (PM)</Text>
      <View style={styles.gridContainer}>
        {/* PM2.5 is the primary indicator, so it sits on top or is highlighted */}
        <View style={[styles.pmHighlightCard, styles.glassCard]}>
          <Text style={styles.pmTitle}>PM2.5 (Fine Particles)</Text>
          <View style={styles.pmRow}>
            <Text style={styles.pmValue}>{telemetry?.pm25 ?? '--'}</Text>
            <Text style={styles.pmUnit}>µg/m³</Text>
          </View>
          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdLabel}>Thresholds:</Text>
            <Text style={[styles.thresholdVal, {color: '#10B981'}]}>&le;50</Text>
            <Text style={[styles.thresholdVal, {color: '#F59E0B'}]}>51-100</Text>
            <Text style={[styles.thresholdVal, {color: '#F97316'}]}>101-150</Text>
            <Text style={[styles.thresholdVal, {color: '#EF4444'}]}>&gt;150</Text>
          </View>
        </View>

        <View style={styles.twoColumnGrid}>
          <View style={[styles.gridCard, styles.glassCard]}>
            <Text style={styles.pmTitle}>PM1.0 (Ultra Fine)</Text>
            <View style={styles.pmRowSmall}>
              <Text style={styles.pmValueSmall}>{telemetry?.pm1 ?? '--'}</Text>
              <Text style={styles.pmUnitSmall}>µg/m³</Text>
            </View>
          </View>
          
          <View style={[styles.gridCard, styles.glassCard]}>
            <Text style={styles.pmTitle}>PM10 (Coarse)</Text>
            <View style={styles.pmRowSmall}>
              <Text style={styles.pmValueSmall}>{telemetry?.pm10 ?? '--'}</Text>
              <Text style={styles.pmUnitSmall}>µg/m³</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Ambient Conditions */}
      <Text style={styles.sectionTitle}>Ambient Conditions</Text>
      <View style={styles.twoColumnGrid}>
        <View style={[styles.gridCard, styles.glassCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Temperature</Text>
            <Thermometer color="#F87171" size={20} />
          </View>
          <View style={styles.valueContainer}>
            <Text style={styles.sensorValue}>
              {telemetry?.temperature !== undefined ? `${telemetry.temperature}°C` : '--'}
            </Text>
          </View>
        </View>

        <View style={[styles.gridCard, styles.glassCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Humidity</Text>
            <Droplets color="#60A5FA" size={20} />
          </View>
          <View style={styles.valueContainer}>
            <Text style={styles.sensorValue}>
              {telemetry?.humidity !== undefined ? `${telemetry.humidity}%` : '--'}
            </Text>
          </View>
        </View>
      </View>

      {/* 4. Equipment & Diagnostics */}
      <Text style={styles.sectionTitle}>Device Diagnostics</Text>
      <View style={styles.twoColumnGrid}>
        <View style={[styles.gridCard, styles.glassCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Gas (MQ-2)</Text>
            <Flame color={smokeAlarmActive ? '#EF4444' : '#94A3B8'} size={20} />
          </View>
          <View style={styles.valueContainer}>
            <Text style={[styles.sensorValue, smokeAlarmActive && styles.dangerText]}>
              {telemetry?.gasValue ?? '--'}
            </Text>
            {smokeAlarmActive && (
              <Text style={styles.subtextAlert}>ALARM TRIGGERED</Text>
            )}
          </View>
        </View>

        <View style={[styles.gridCard, styles.glassCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Ionizer</Text>
            <Wind color="#A78BFA" size={20} />
          </View>
          <View style={styles.valueContainer}>
            <Text style={[styles.statusBadgeText, telemetry?.ionizerOn ? styles.onText : styles.offText]}>
              {telemetry ? (telemetry.ionizerOn ? 'ACTIVE' : 'INACTIVE') : '--'}
            </Text>
            {telemetry?.ionizerOn && (
              <Text style={styles.subtextNote}>PM2.5 &gt; 80 triggers Auto-On</Text>
            )}
          </View>
        </View>
      </View>

      {/* Connection Info */}
      <View style={[styles.infoCard, styles.glassCard]}>
        <View style={styles.infoRow}>
          <View style={styles.infoField}>
            <Wifi color="#38BDF8" size={16} />
            <Text style={styles.infoText}>WiFi RSSI:</Text>
            <Text style={styles.infoVal}>
              {telemetry?.wifiRSSI ? `${telemetry.wifiRSSI} dBm (${getWifiSignalStrength(telemetry.wifiRSSI)})` : '--'}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoField}>
            <Info color="#94A3B8" size={16} />
            <Text style={styles.infoText}>Device Status:</Text>
            <Text style={[styles.infoVal, deviceStatus === 'online' ? styles.onlineVal : styles.offlineVal]}>
              {deviceStatus.toUpperCase()}
            </Text>
          </View>
        </View>
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
    paddingBottom: 32,
  },
  aqiCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  aqiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aqiLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  aqiValue: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 12,
    letterSpacing: 0.5,
  },
  aqiDesc: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 12,
    paddingLeft: 4,
  },
  gridContainer: {
    marginBottom: 10,
  },
  glassCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pmHighlightCard: {
    marginBottom: 12,
    padding: 18,
  },
  pmTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pmValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  pmUnit: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '600',
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: '#334155',
    paddingTop: 10,
  },
  thresholdLabel: {
    color: '#64748B',
    fontSize: 11,
    marginRight: 6,
  },
  thresholdVal: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    width: cardWidth,
  },
  pmRowSmall: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pmValueSmall: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  pmUnitSmall: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  valueContainer: {
    flexDirection: 'column',
  },
  sensorValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statusBadgeText: {
    fontSize: 20,
    fontWeight: '800',
  },
  onText: {
    color: '#A78BFA',
  },
  offText: {
    color: '#64748B',
  },
  subtextNote: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  dangerText: {
    color: '#EF4444',
  },
  subtextAlert: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  infoCard: {
    marginTop: 8,
    padding: 14,
  },
  infoRow: {
    marginVertical: 4,
  },
  infoField: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 13,
    marginLeft: 8,
    marginRight: 6,
  },
  infoVal: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  onlineVal: {
    color: '#10B981',
  },
  offlineVal: {
    color: '#EF4444',
  },
});
