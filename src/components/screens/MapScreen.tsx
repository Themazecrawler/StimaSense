import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OutageMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  status: 'active' | 'resolved' | 'predicted';
  affected: number;
  duration: string;
  severity: 'low' | 'medium' | 'high';
}

export function MapScreen() {
  const { colors } = useTheme();
  const [selectedMarker, setSelectedMarker] = useState<OutageMarker | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [showLegend, setShowLegend] = useState(false);

  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const outageMarkers: OutageMarker[] = [
    {
      id: '1',
      latitude: 37.7849,
      longitude: -122.4094,
      title: 'Downtown District Outage',
      description: 'Major outage affecting commercial area',
      status: 'active',
      affected: 1200,
      duration: '2h 15m',
      severity: 'high',
    },
    {
      id: '2',
      latitude: 37.7649,
      longitude: -122.4294,
      title: 'Mission Bay Predicted',
      description: 'High probability outage due to maintenance',
      status: 'predicted',
      affected: 340,
      duration: 'Tomorrow 2-4 PM',
      severity: 'medium',
    },
    {
      id: '3',
      latitude: 37.7949,
      longitude: -122.3994,
      title: 'Castro District Resolved',
      description: 'Power restored to all customers',
      status: 'resolved',
      affected: 890,
      duration: '45 minutes',
      severity: 'low',
    },
  ];

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'active': return colors.powerOff;
      case 'predicted': return colors.powerPredicted;
      case 'resolved': return colors.powerOn;
      default: return colors.mutedForeground;
    }
  };

  const getSeverityRadius = (severity: string) => {
    switch (severity) {
      case 'high': return 1000;
      case 'medium': return 500;
      case 'low': return 200;
      default: return 100;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.foreground,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapContainer: {
      flex: 1,
      margin: 20,
      borderRadius: 16,
      overflow: 'hidden',
    },
    map: {
      flex: 1,
    },
    mapControls: {
      position: 'absolute',
      top: 20,
      right: 20,
      gap: 12,
    },
    controlButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    markerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    markerCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
    },
    markerIcon: {
      position: 'absolute',
    },
    selectedMarkerPulse: {
      width: 48,
      height: 48,
      borderRadius: 24,
      position: 'absolute',
      borderWidth: 2,
      borderColor: colors.emergencyPrimary + '60',
    },
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 24,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    bottomSheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    markerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    markerDescription: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 16,
    },
    markerStats: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    stat: {
      flex: 1,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    statLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.emergencyPrimary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
    legend: {
      position: 'absolute',
      bottom: selectedMarker ? 200 : 20,
      left: 20,
      right: 20,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    legendTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    legendItems: {
      gap: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    legendText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
  });

  const mapStyle = [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [{ color: colors.background }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: colors.muted }],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Outage Map</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowLegend(!showLegend)}
          >
            <Icon name="info" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {/* Add search functionality */}}
          >
            <Icon name="search" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          mapType={mapType}
          customMapStyle={mapStyle}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {outageMarkers.map((marker) => (
            <React.Fragment key={marker.id}>
              <Marker
                coordinate={{
                  latitude: marker.latitude,
                  longitude: marker.longitude,
                }}
                onPress={() => setSelectedMarker(marker)}
              >
                <View style={styles.markerContainer}>
                  {selectedMarker?.id === marker.id && (
                    <View style={styles.selectedMarkerPulse} />
                  )}
                  <View
                    style={[
                      styles.markerCircle,
                      { backgroundColor: getMarkerColor(marker.status) },
                    ]}
                  >
                    <Icon
                      name={marker.status === 'active' ? 'zap-off' : 
                            marker.status === 'predicted' ? 'alert-triangle' : 'check'}
                      size={12}
                      color="#ffffff"
                    />
                  </View>
                </View>
              </Marker>
              <Circle
                center={{
                  latitude: marker.latitude,
                  longitude: marker.longitude,
                }}
                radius={getSeverityRadius(marker.severity)}
                fillColor={getMarkerColor(marker.status) + '20'}
                strokeColor={getMarkerColor(marker.status) + '60'}
                strokeWidth={1}
              />
            </React.Fragment>
          ))}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
          >
            <Icon name="layers" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {/* Center on user location */}}
          >
            <Icon name="navigation" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Map Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.powerOff }]} />
              <Text style={styles.legendText}>Active Outage</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.powerPredicted }]} />
              <Text style={styles.legendText}>Predicted Outage</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.powerOn }]} />
              <Text style={styles.legendText}>Recently Resolved</Text>
            </View>
          </View>
        </View>
      )}

      {/* Selected Marker Bottom Sheet */}
      {selectedMarker && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.markerTitle}>{selectedMarker.title}</Text>
            <Badge 
              variant={selectedMarker.status === 'active' ? 'destructive' : 
                      selectedMarker.status === 'predicted' ? 'secondary' : 'default'}
              style={{ marginLeft: 12 }}
            >
              {selectedMarker.status}
            </Badge>
          </View>
          
          <Text style={styles.markerDescription}>{selectedMarker.description}</Text>
          
          <View style={styles.markerStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{selectedMarker.affected.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Affected</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{selectedMarker.duration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{selectedMarker.severity}</Text>
              <Text style={styles.statLabel}>Severity</Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setSelectedMarker(null)}
            >
              <Text style={styles.primaryButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}