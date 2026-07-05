import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RelayData, mqttService } from '../services/mqttService';
import { Lightbulb, Settings, Power, ShieldAlert } from 'lucide-react-native';

interface RelayCardProps {
  relay: RelayData | null;
}

export const RelayCard: React.FC<RelayCardProps> = ({ relay }) => {
  const isLightOn = relay?.relayState ?? false;
  const currentMode = relay?.relayMode ?? 'auto';

  const handleModeSelection = (mode: '0' | '1' | '2') => {
    mqttService.setRelayMode(mode);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.mainCard, styles.glassCard, isLightOn ? styles.bulbOnBorder : styles.bulbOffBorder]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AC Bulb Control</Text>
          <View style={[styles.modeBadge, currentMode === 'auto' ? styles.autoBadge : styles.manualBadge]}>
            <Text style={styles.badgeText}>
              {currentMode === 'auto' ? 'AUTO CONTROL' : 'MANUAL OVERRIDE'}
            </Text>
          </View>
        </View>

        {/* Bulb visualizer */}
        <View style={styles.visualizerContainer}>
          <View style={[
            styles.bulbShadowWrapper,
            isLightOn ? styles.glowBg : styles.dimBg
          ]}>
            <Lightbulb 
              color={isLightOn ? '#FBBF24' : '#475569'} 
              size={64} 
              strokeWidth={1.5}
            />
          </View>
          <Text style={[styles.statusText, isLightOn ? styles.lightOnText : styles.lightOffText]}>
            {isLightOn ? 'LIGHT IS ON' : 'LIGHT IS OFF'}
          </Text>
        </View>

        {/* Mode Selector Panel */}
        <Text style={styles.panelTitle}>Select Operational Mode</Text>
        <View style={styles.btnRow}>
          
          <Pressable 
            onPress={() => handleModeSelection('2')} // Return to AUTO
            style={({ pressed }) => [
              styles.modeBtn,
              currentMode === 'auto' ? styles.btnActiveAuto : styles.btnInactive,
              pressed && styles.btnPressed
            ]}
          >
            <Settings size={18} color={currentMode === 'auto' ? '#F8FAFC' : '#94A3B8'} />
            <Text style={[styles.btnText, currentMode === 'auto' ? styles.btnTextActive : styles.btnTextInactive]}>
              AUTO
            </Text>
          </Pressable>

          <Pressable 
            onPress={() => handleModeSelection('1')} // Force MANUAL ON
            style={({ pressed }) => [
              styles.modeBtn,
              currentMode === 'manual_on' ? styles.btnActiveOn : styles.btnInactive,
              pressed && styles.btnPressed
            ]}
          >
            <Power size={18} color={currentMode === 'manual_on' ? '#F8FAFC' : '#94A3B8'} />
            <Text style={[styles.btnText, currentMode === 'manual_on' ? styles.btnTextActive : styles.btnTextInactive]}>
              ON
            </Text>
          </Pressable>

          <Pressable 
            onPress={() => handleModeSelection('0')} // Force MANUAL OFF
            style={({ pressed }) => [
              styles.modeBtn,
              currentMode === 'manual_off' ? styles.btnActiveOff : styles.btnInactive,
              pressed && styles.btnPressed
            ]}
          >
            <Power size={18} color={currentMode === 'manual_off' ? '#F8FAFC' : '#94A3B8'} />
            <Text style={[styles.btnText, currentMode === 'manual_off' ? styles.btnTextActive : styles.btnTextInactive]}>
              OFF
            </Text>
          </Pressable>

        </View>

        {/* Warning / Informational context */}
        <View style={styles.footerNote}>
          <ShieldAlert color="#64748B" size={16} />
          <Text style={styles.footerText}>
            {currentMode === 'auto'
              ? 'AUTO mode mirrors the room occupancy state. The bulb turns ON when occupied and OFF when vacant.'
              : 'MANUAL mode overrides occupancy-timer logic. Settings will persist on-device until set back to AUTO.'}
          </Text>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0F172A',
    flex: 1,
  },
  mainCard: {
    padding: 20,
    borderWidth: 1.5,
  },
  glassCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  bulbOnBorder: {
    borderColor: '#F59E0B',
  },
  bulbOffBorder: {
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  autoBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  manualBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  visualizerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  bulbShadowWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBg: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  dimBg: {
    backgroundColor: 'rgba(71, 85, 105, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(71, 85, 105, 0.1)',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  lightOnText: {
    color: '#FBBF24',
  },
  lightOffText: {
    color: '#64748B',
  },
  panelTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 12,
    alignSelf: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    gap: 6,
  },
  btnActiveAuto: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  btnActiveOn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  btnActiveOff: {
    backgroundColor: '#64748B',
    borderColor: '#64748B',
  },
  btnInactive: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnTextActive: {
    color: '#F8FAFC',
  },
  btnTextInactive: {
    color: '#94A3B8',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderColor: '#334155',
    borderWidth: 1,
    gap: 10,
  },
  footerText: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
