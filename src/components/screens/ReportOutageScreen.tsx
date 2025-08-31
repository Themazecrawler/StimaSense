import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/Separator';
import { mlService } from '../../../services/ml/MLService';
import { LivePrediction } from '../../../services/ml/AutoPredictionService';

interface OutageReport {
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: string;
  contactInfo?: string;
}

export default function ReportOutageScreen() {
  const { colors } = useTheme();
  const [report, setReport] = useState<OutageReport>({
    location: '',
    description: '',
    severity: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [predictionHistory, setPredictionHistory] = useState<LivePrediction[]>([]);
  const [recentPreds, setRecentPreds] = useState<LivePrediction[]>([]);

  useEffect(() => {
    loadPredictionHistory();
  }, []);

  const loadPredictionHistory = async () => {
    try {
      const history = await mlService.getPredictionHistory();
      setPredictionHistory(history);
      
      // Get recent predictions for the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = history.filter((p: { predictionTime: Date }) => 
        new Date(p.predictionTime) > oneDayAgo
      );
      setRecentPreds(recent);
    } catch (error) {
      console.error('Failed to load prediction history:', error);
    }
  };

  const handleSubmit = async () => {
    if (!report.location.trim() || !report.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Success', 
        'Your outage report has been submitted. We will investigate and provide updates.',
        [
          {
            text: 'OK',
            onPress: () => {
              setReport({
                location: '',
                description: '',
                severity: 'medium',
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallKPLC = () => {
    const phoneNumber = 'tel:+2540203201000';
    Linking.canOpenURL(phoneNumber).then(supported => {
      if (supported) {
        Linking.openURL(phoneNumber);
      } else {
        Alert.alert('Phone calls not supported', 'Phone calls are not supported on this device.');
      }
    });
  };

  const handleCallEmergency = () => {
    const phoneNumber = 'tel:999';
    Linking.canOpenURL(phoneNumber).then(supported => {
      if (supported) {
        Linking.openURL(phoneNumber);
      } else {
        Alert.alert('Phone calls not supported', 'Phone calls are not supported on this device.');
      }
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return colors.emergencySuccess;
      case 'medium': return colors.emergencyWarning;
      case 'high': return colors.emergencyDanger;
      case 'critical': return colors.emergencyPrimary;
      default: return colors.mutedForeground;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'low': return 'Low Impact';
      case 'medium': return 'Medium Impact';
      case 'high': return 'High Impact';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <Text style={[styles.headerTitle, { color: colors.primaryForeground }]}>Report Outage</Text>
            <Text style={[styles.headerSubtitle, { color: colors.primaryForeground }]}>
              Help us track and resolve power issues
            </Text>
          </View>

          {/* Quick Actions */}
          <Card style={styles.quickActionsCard}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleCallKPLC}
              >
                <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                  Call KPLC
                </Text>
                <Text style={[styles.actionButtonSubtext, { color: colors.primaryForeground }]}>
                  +254 020 320 1000
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.emergencyPrimary }]}
                onPress={handleCallEmergency}
              >
                <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                  Emergency
                </Text>
                <Text style={[styles.actionButtonSubtext, { color: colors.primaryForeground }]}>
                  999
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Report Form */}
          <Card style={styles.formCard}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Outage Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                Location * <Text style={{ color: colors.destructive }}>(Required)</Text>
              </Text>
              <Input
                placeholder="Enter your exact location or address"
                value={report.location}
                onChangeText={(text) => setReport({ ...report, location: text })}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                Description * <Text style={{ color: colors.destructive }}>(Required)</Text>
              </Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: colors.card,
                  color: colors.foreground,
                  borderColor: colors.border 
                }]}
                placeholder="Describe what you're experiencing..."
                placeholderTextColor={colors.mutedForeground}
                value={report.description}
                onChangeText={(text) => setReport({ ...report, description: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Severity Level</Text>
              <View style={styles.severityButtons}>
                {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      styles.severityButton,
                      { 
                        backgroundColor: report.severity === severity 
                          ? getSeverityColor(severity) 
                          : colors.card,
                        borderColor: getSeverityColor(severity)
                      }
                    ]}
                    onPress={() => setReport({ ...report, severity })}
                  >
                    <Text style={[
                      styles.severityButtonText,
                      { 
                        color: report.severity === severity 
                          ? colors.primaryForeground 
                          : getSeverityColor(severity)
                      }
                    ]}>
                      {getSeverityLabel(severity)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                Estimated Duration (Optional)
              </Text>
              <Input
                placeholder="e.g., 2 hours, since morning"
                value={report.estimatedDuration}
                onChangeText={(text) => setReport({ ...report, estimatedDuration: text })}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                Contact Information (Optional)
              </Text>
              <Input
                placeholder="Phone number for updates"
                value={report.contactInfo}
                onChangeText={(text) => setReport({ ...report, contactInfo: text })}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
          </Card>

          {/* Recent Predictions */}
          {recentPreds.length > 0 && (
            <Card style={styles.predictionsCard}>
                              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Recent AI Predictions for Your Area
                </Text>
                
                {recentPreds.slice(0, 3).map((pred, index) => (
                  <View key={index} style={styles.predictionItem}>
                    <View style={styles.predictionHeader}>
                      <Badge 
                        variant="secondary" 
                        style={{ backgroundColor: getSeverityColor(pred.prediction.riskLevel) }}
                      >
                        <Text style={{ color: colors.primaryForeground }}>
                          {pred.prediction.riskLevel.toUpperCase()}
                        </Text>
                      </Badge>
                      <Text style={[styles.predictionTime, { color: colors.mutedForeground }]}>
                        {new Date(pred.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <Text style={[styles.predictionText, { color: colors.foreground }]}>
                      {pred.recommendations.join(', ')}
                    </Text>
                    {index < recentPreds.length - 1 && <Separator />}
                  </View>
                ))}
            </Card>
          )}

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button
              title={isSubmitting ? "Submitting..." : "Submit Report"}
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
            <Text style={[styles.submitNote, { color: colors.mutedForeground }]}>
              Your report helps improve our outage tracking and response times
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

  const styles = StyleSheet.create({
    container: {
      flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Ensure submit button is not cut off
    },
    header: {
    paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    },
    headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  quickActionsCard: {
    margin: 20,
    marginTop: 0,
  },
  formCard: {
    margin: 20,
    marginTop: 0,
  },
  predictionsCard: {
    margin: 20,
    marginTop: 0,
    },
    sectionTitle: {
      fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    },
  actionButtons: {
      flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
    alignItems: 'center',
    },
  actionButtonText: {
      fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    opacity: 0.9,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
      fontSize: 14,
    fontWeight: '600',
      marginBottom: 8,
    },
  input: {
    marginBottom: 0,
    },
    textArea: {
    borderWidth: 1,
      borderRadius: 8,
    paddingHorizontal: 12,
      paddingVertical: 12,
    fontSize: 16,
      minHeight: 100,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  severityButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
      borderWidth: 2,
    minWidth: 80,
      alignItems: 'center',
  },
  severityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  predictionItem: {
      marginBottom: 16,
    },
    predictionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    predictionTime: {
    fontSize: 12,
    },
  predictionText: {
      fontSize: 14,
    lineHeight: 20,
  },
  predictionSeparator: {
    marginTop: 16,
  },
  submitContainer: {
    padding: 20,
    paddingTop: 0,
      alignItems: 'center',
    },
    submitButton: {
    width: '100%',
    marginBottom: 12,
  },
  submitNote: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    },
  });

