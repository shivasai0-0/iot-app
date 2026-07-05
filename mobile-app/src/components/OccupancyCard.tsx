import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { OccupancyData } from '../services/mqttService';
import { Eye, EyeOff, User, UserMinus } from 'lucide-react-native';

interface OccupancyCardProps {
  occupancy: OccupancyData | null;
}

export const OccupancyCard: React.FC<OccupancyCardProps> = ({ occupancy }) => {
  const isOccupied = occupancy?.roomOccupied ?? false;
  const isMotionDetected = occupancy?.pirState ?? false;

  // Animation for occupancy state pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    
    if (isOccupied) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      animation?.stop();
    };
  }, [isOccupied]);

  return (
    <View style={styles.container}>
      <View style={[styles.mainCard, styles.glassCard, isOccupied ? styles.occupiedBorder : styles.vacantBorder]}>
        
        {/* Status Indicator Row */}
        <View style={styles.header}>
          <Text style={styles.title}>Room Occupancy State</Text>
          <View style={[styles.badge, isOccupied ? styles.occupiedBadge : styles.vacantBadge]}>
            <Text style={[styles.badgeText, isOccupied ? styles.occupiedText : styles.vacantText]}>
              {isOccupied ? 'OCCUPIED' : 'VACANT'}
            </Text>
          </View>
        </View>

        {/* Visual Graphic Representation */}
        <View style={styles.graphicContainer}>
          <Animated.View 
            style={[
              styles.iconWrapper, 
              isOccupied ? styles.occupiedBg : styles.vacantBg,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            {isOccupied ? (
              <User color="#10B981" size={48} strokeWidth={1.5} />
            ) : (
              <UserMinus color="#64748B" size={48} strokeWidth={1.5} />
            )}
          </Animated.View>
        </View>

        <Text style={styles.description}>
          {isOccupied 
            ? 'The room is currently occupied. The exit timer will vacate the status 60 seconds after motion ceases.'
            : 'The room is vacant. The system is scanning for motion to activate controls.'}
        </Text>

        {/* PIR Motion Sensor Details */}
        <View style={[styles.sensorStatus, isMotionDetected ? styles.pirActiveBg : styles.pirInactiveBg]}>
          {isMotionDetected ? (
            <View style={styles.statusRow}>
              <Eye color="#38BDF8" size={20} />
              <Text style={styles.statusLabel}>PIR Motion Sensor:</Text>
              <Text style={styles.statusValueActive}>MOTION DETECTED</Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <EyeOff color="#64748B" size={20} />
              <Text style={styles.statusLabel}>PIR Motion Sensor:</Text>
              <Text style={styles.statusValueInactive}>STATIONARY</Text>
            </View>
          )}
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
  occupiedBorder: {
    borderColor: '#10B981',
  },
  vacantBorder: {
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  occupiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  vacantBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  occupiedText: {
    color: '#10B981',
  },
  vacantText: {
    color: '#94A3B8',
  },
  graphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  occupiedBg: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  vacantBg: {
    backgroundColor: 'rgba(148, 163, 184, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  description: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  sensorStatus: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  pirActiveBg: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  pirInactiveBg: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  statusValueActive: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  statusValueInactive: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
