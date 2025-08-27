import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { launchCamera, launchImageLibrary, MediaType } from 'react-native-image-picker';
import { PermissionsAndroid } from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

// Import services for federated learning
import { modelFeedbackService } from '../../services/ml/ModelFeedbackService';
import { federatedLearningService } from '../../services/ml/FederatedLearningService';
import { weatherService } from '../../services/weather/WeatherService';


interface OutageReportData {
  hasOutage: boolean;
  outageStartTime: Date | null;
  outageEndTime: Date | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cause: 'weather' | 'equipment' | 'overload' | 'maintenance' | 'unknown';
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  affectedArea: string;
  estimatedCustomersAffected: number;
  photos: string[];
  reporterConfidence: number; // 1-5 scale
  additionalNotes: string;
}

export function ReportOutageScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  
  const [reportData, setReportData] = useState<OutageReportData>({
    hasOutage: true,
    outageStartTime: new Date(),
    outageEndTime: null,
    severity: 'medium',
    cause: 'unknown',
    description: '',
    location: { latitude: 0, longitude: 0 },
    affectedArea: '',
    estimatedCustomersAffected: 1,
    photos: [],
    reporterConfidence: 4,
    additionalNotes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [recentPredictions, setRecentPredictions] = useState<any[]>([]);
  const [selectedPredictionId, setSelectedPredictionId] = useState<string | null>(null);

  useEffect(() => {
    initializeReport();
  }, []);

  const initializeReport = async () => {
    try {
      // Request permissions
      await requestPermissions();
      
      // Get current location
      await getCurrentLocation();
      
      // Load recent predictions to link this report
      await loadRecentPredictions();
      
    } catch (error) {
      console.error('Failed to initialize report:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      // Placeholder permissions
      const locationStatus = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      setLocationPermission(locationStatus === 'granted');

      const cameraStatus = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      setCameraPermission(cameraStatus === 'granted');
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const getCurrentLocation = async () => {
    if (!locationPermission) return;

    try {
      const location = await new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          pos => resolve(pos),
          err => reject(err),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
      });

      setReportData(prev => ({
        ...prev,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      }));

      // Placeholder reverse geocode
      const formattedAddress = undefined as any;
      setReportData(prev => ({
        ...prev,
        location: { ...prev.location, address: formattedAddress },
        affectedArea: 'Unknown Area',
      }));
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const loadRecentPredictions = async () => {
    try {
      // Get recent predictions that could be related to this report
      const predictionHistory = await modelFeedbackService.getPendingFeedbackRequests();
      
      // Filter predictions from the last 24 hours
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPreds = predictionHistory.filter(p => 
        new Date(p.predictionTime) > cutoffTime
      );

      setRecentPredictions(recentPreds);
      
      // Auto-select the most recent high-risk prediction
      const highRiskPrediction = recentPreds.find(p => 
        p.riskLevel === 'high' || p.riskLevel === 'critical'
      );
      
      if (highRiskPrediction) {
        setSelectedPredictionId(highRiskPrediction.predictionId);
      }
    } catch (error) {
      console.error('Failed to load recent predictions:', error);
    }
  };

  const handlePhotoCapture = async () => {
    if (!cameraPermission) {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return;
    }

    const options = [
      { text: 'Take Photo', onPress: () => capturePhoto('camera') },
      { text: 'Choose from Library', onPress: () => capturePhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ];

    Alert.alert('Add Photo', 'How would you like to add a photo?', options as any);
  };

  const capturePhoto = async (source: 'camera' | 'library') => {
    try {
      const result = source === 'camera' 
        ? await launchCamera({ mediaType: 'photo', quality: 0.8 })
        : await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });

      if (!result.didCancel) {
        const uri = result.assets?.[0]?.uri;
        if (uri) {
          setReportData(prev => ({
            ...prev,
            photos: [...prev.photos, uri],
          }));
        }
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handleSubmitReport = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!reportData.description.trim()) {
        Alert.alert('Validation Error', 'Please provide a description of the outage.');
        return;
      }

      if (reportData.hasOutage && !reportData.outageStartTime) {
        Alert.alert('Validation Error', 'Please specify when the outage started.');
        return;
      }

      // Collect current environmental data for training
      const [weatherData, gridData] = await Promise.all([
        weatherService.getWeatherForLocation(
          reportData.location.latitude,
          reportData.location.longitude
        ),
        null, // Grid data removed - not available in Kenya
      ]);

      // Submit feedback for related prediction if selected
      if (selectedPredictionId) {
        await modelFeedbackService.submitPredictionFeedback(
          selectedPredictionId,
          reportData.hasOutage,
          reportData.reporterConfidence,
          {
            hadOutage: reportData.hasOutage,
            outageDetails: reportData.hasOutage ? {
              startTime: reportData.outageStartTime!,
              endTime: reportData.outageEndTime,
              duration: reportData.outageEndTime && reportData.outageStartTime
                ? Math.round((reportData.outageEndTime.getTime() - reportData.outageStartTime.getTime()) / (1000 * 60))
                : 0,
              cause: reportData.cause,
              severity: reportData.severity,
              affectedArea: reportData.affectedArea,
              estimatedCustomersAffected: reportData.estimatedCustomersAffected,
            } : undefined,
            verificationSource: 'user_report',
          },
          {
            reportMethod: 'manual',
            confidence: reportData.reporterConfidence,
            hasPhotos: reportData.photos.length > 0,
            hasAdditionalReports: false,
          }
        );

        // Mark feedback as requested
        await modelFeedbackService.markFeedbackRequested(selectedPredictionId);
      }

      // Create training data for federated learning
      if (weatherData && gridData) {
        const trainingInput = {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          windSpeed: weatherData.windSpeed,
          precipitation: weatherData.precipitation,
          gridLoad: (gridData as any)?.load,
          timeOfDay: new Date().getHours() + new Date().getMinutes() / 60,
          dayOfWeek: new Date().getDay(),
          season: Math.floor((new Date().getMonth() + 1) / 3),
          location: {
            latitude: reportData.location.latitude,
            longitude: reportData.location.longitude,
          },
          historicalOutages: 1, // Would be calculated from actual history
        };

        await federatedLearningService.addTrainingDataFromReport(
          selectedPredictionId || `manual_${Date.now()}`,
          reportData.hasOutage,
          reportData.hasOutage ? {
            startTime: reportData.outageStartTime,
            endTime: reportData.outageEndTime,
            duration: reportData.outageEndTime && reportData.outageStartTime
              ? Math.round((reportData.outageEndTime.getTime() - reportData.outageStartTime.getTime()) / (1000 * 60))
              : 0,
            affectedCustomers: reportData.estimatedCustomersAffected,
            location: reportData.location,
            cause: reportData.cause,
            severity: reportData.severity,
            status: reportData.outageEndTime ? 'resolved' : 'active',
          } : undefined,
          {
            reportedAt: new Date(),
            accuracy: reportData.reporterConfidence,
            confidence: reportData.reporterConfidence,
            hasPhotos: reportData.photos.length > 0,
            verified: false, // Will be verified later
          }
        );
      }

      // Store report locally (for offline capability)
      await storeReportLocally();

      Alert.alert(
        'Report Submitted',
        'Thank you for your report! This helps improve our predictions for the community.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert(
        'Submission Failed',
        'Failed to submit your report. It has been saved locally and will be sent when connection is restored.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const storeReportLocally = async () => {
    // Implementation for storing reports locally for offline capability
    // This would be handled by a separate service
    console.log('Report stored locally:', reportData);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerGradient: {
      borderRadius: 12,
      padding: 16,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle: {
      flex: 1,
      fontSize: 24,
      fontWeight: '600',
      color: '#ffffff',
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    scrollContent: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    outageToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 16,
    },
    toggleText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.foreground,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    formField: {
      flex: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
      marginBottom: 8,
    },
    picker: {
      backgroundColor: colors.input,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerText: {
      color: colors.foreground,
      fontSize: 16,
    },
    textArea: {
      backgroundColor: colors.input,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 100,
      textAlignVertical: 'top',
      color: colors.foreground,
      fontSize: 16,
    },
    photoSection: {
      marginBottom: 24,
    },
    addPhotoButton: {
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted + '30',
    },
    addPhotoText: {
      color: colors.mutedForeground,
      fontSize: 16,
      fontWeight: '500',
      marginTop: 8,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    photo: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    predictionSection: {
      marginBottom: 24,
    },
    predictionCard: {
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
    },
    selectedPrediction: {
      borderColor: colors.emergencyPrimary,
      backgroundColor: colors.emergencyPrimary + '10',
    },
    predictionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    predictionTime: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    predictionDescription: {
      fontSize: 14,
      color: colors.foreground,
    },
    confidenceSlider: {
      marginBottom: 24,
    },
    sliderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    confidenceLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    submitButton: {
      borderRadius: 12,
      marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    submitButtonInner: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
  });

  const severityOptions = [
    { value: 'low', label: 'Low - Minor inconvenience' },
    { value: 'medium', label: 'Medium - Significant impact' },
    { value: 'high', label: 'High - Major disruption' },
    { value: 'critical', label: 'Critical - Emergency situation' },
  ];

  const causeOptions = [
    { value: 'weather', label: 'Weather Related' },
    { value: 'equipment', label: 'Equipment Failure' },
    { value: 'overload', label: 'System Overload' },
    { value: 'maintenance', label: 'Scheduled Maintenance' },
    { value: 'unknown', label: 'Unknown Cause' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.emergencyPrimary, colors.emergencySecondary]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report Outage</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Help improve predictions for your community
          </Text>
        </LinearGradient>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Outage Status Toggle */}
        <Card style={styles.outageToggle}>
          <Text style={styles.toggleText}>
            {reportData.hasOutage ? 'Confirming an outage' : 'No outage to report'}
          </Text>
          <Switch
            value={reportData.hasOutage}
            onValueChange={(value) => setReportData(prev => ({ ...prev, hasOutage: value }))}
            trackColor={{ false: colors.muted, true: colors.emergencyPrimary }}
          />
        </Card>

        {reportData.hasOutage && (
          <>
            {/* Recent Predictions */}
            {recentPredictions.length > 0 && (
              <View style={styles.predictionSection}>
                <Text style={styles.sectionTitle}>Related Predictions</Text>
                <Text style={styles.label}>
                  Were you expecting this outage based on our predictions?
                </Text>
                {recentPredictions.map((prediction) => (
                  <TouchableOpacity
                    key={prediction.predictionId}
                    style={[
                      styles.predictionCard,
                      selectedPredictionId === prediction.predictionId && styles.selectedPrediction,
                    ]}
                    onPress={() => setSelectedPredictionId(prediction.predictionId)}
                  >
                    <View style={styles.predictionHeader}>
                      <Text style={styles.predictionTime}>
                        {new Date(prediction.predictionTime).toLocaleString()}
                      </Text>
                      <Badge variant={prediction.riskLevel === 'high' ? 'destructive' : 'secondary'}>
                        {prediction.riskLevel}
                      </Badge>
                    </View>
                    <Text style={styles.predictionDescription}>
                      Predicted {prediction.riskLevel} risk of outage in your area
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Timing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Outage Details</Text>
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Started At</Text>
                  <TouchableOpacity style={styles.picker}>
                    <Text style={styles.pickerText}>
                      {formatTime(reportData.outageStartTime) || 'Select time'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.label}>Ended At (if resolved)</Text>
                  <TouchableOpacity style={styles.picker}>
                    <Text style={styles.pickerText}>
                      {formatTime(reportData.outageEndTime) || 'Still ongoing'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Severity and Cause */}
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>Severity</Text>
                <TouchableOpacity style={styles.picker}>
                  <Text style={styles.pickerText}>
                    {severityOptions.find(o => o.value === reportData.severity)?.label}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Likely Cause</Text>
                <TouchableOpacity style={styles.picker}>
                  <Text style={styles.pickerText}>
                    {causeOptions.find(o => o.value === reportData.cause)?.label}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <Input
                style={{ ...(styles.textArea as any), height: 100 }}
                placeholder="Describe what happened, what you observed, etc..."
                value={reportData.description}
                onChangeText={(text) => setReportData(prev => ({ ...prev, description: text }))}
                multiline
              />
            </View>

            {/* Photos */}
            <View style={styles.photoSection}>
              <Text style={styles.sectionTitle}>Photos (Optional)</Text>
              {reportData.photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {reportData.photos.map((photo, index) => (
                    <View key={index} style={styles.photo} />
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.addPhotoButton} onPress={handlePhotoCapture}>
                <Icon name="camera" size={32} color={colors.mutedForeground} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Confidence Rating */}
            <View style={styles.confidenceSlider}>
              <Text style={styles.sectionTitle}>Your Confidence</Text>
              <Text style={styles.label}>How confident are you in this report?</Text>
              <View style={styles.sliderRow}>
                <Text style={styles.confidenceLabel}>Not Sure</Text>
                <Text style={[styles.confidenceLabel, { fontWeight: '600' }]}>
                  {reportData.reporterConfidence}/5
                </Text>
                <Text style={styles.confidenceLabel}>Very Sure</Text>
              </View>
            </View>
          </>
        )}

        {/* Submit Button */}
        <LinearGradient
          colors={[colors.emergencyPrimary, colors.emergencySecondary]}
          style={styles.submitButton}
        >
          <TouchableOpacity
            style={styles.submitButtonInner}
            onPress={handleSubmitReport}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}