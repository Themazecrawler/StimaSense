import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

const navigationItems: Array<{ id: string; label: string; icon: string }> = [
  { id: 'Dashboard', label: 'Home', icon: 'home' },
  { id: 'Map', label: 'Map', icon: 'map' },
  { id: 'Analytics', label: 'Analytics', icon: 'bar-chart-2' },
  { id: 'Alerts', label: 'Alerts', icon: 'bell' },
  { id: 'Profile', label: 'Profile', icon: 'user' },
];

export function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {navigationItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onNavigate(item.id)}
            >
              <Icon
                name={item.icon as any}
                size={18}
                color={isActive ? '#E53935' : '#666'}
                style={styles.icon}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    height: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(229,57,53,0.08)',
    borderRadius: 8,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
  labelActive: {
    color: '#E53935',
    fontWeight: '600',
  },
});