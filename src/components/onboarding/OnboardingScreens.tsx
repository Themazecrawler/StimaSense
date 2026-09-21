import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../observability/logger';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  features: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to StimaSense',
    description: 'See outage information with clear source and freshness labels.',
    icon: 'zap',
    features: [
      'Kenya Power notice provenance',
      'Observation timestamps',
      'No synthetic operational data'
    ]
  },
  {
    id: 2,
    title: 'Planned Interruptions',
    description: 'Review validated maintenance notices published by Kenya Power.',
    icon: 'users',
    features: [
      'Service-area descriptions',
      'Scheduled start and end times',
      'Links to official source documents'
    ]
  },
  {
    id: 3,
    title: 'Weather Context',
    description: 'View current weather observations when the provider and device location are available.',
    icon: 'cloud',
    features: [
      'Provider attribution',
      'Freshness indicators',
      'Explicit unavailable states'
    ]
  },
  {
    id: 4,
    title: 'Honest Feature Status',
    description: 'Prediction, active-outage mapping, and in-app reporting stay disabled until their operational dependencies are ready.',
    icon: 'shield',
    features: [
      'No demo data in production',
      'No unverified reports presented as fact',
      'Clear next steps when a feature is unavailable'
    ]
  }
];

export function OnboardingScreens({ onComplete }: { onComplete?: () => void }) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('isOnboarded', 'true');
      onComplete?.();
    } catch (error) {
      logger.error('onboarding.complete_failed', error);
    }
  };

  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    progressContainer: {
      width: '100%',
      marginBottom: 32,
    },
    progressText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: 8,
    },
    skipButton: {
      position: 'absolute',
      top: 20,
      right: 24,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    skipText: {
      fontSize: 16,
      color: colors.mutedForeground,
      fontWeight: '500',
    },
    iconContainer: {
      marginBottom: 40,
      alignItems: 'center',
    },
    iconGradient: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    stepContent: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 36,
    },
    description: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    featuresContainer: {
      alignSelf: 'stretch',
      marginBottom: 40,
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.muted + '30',
      borderRadius: 12,
      marginBottom: 12,
    },
    featureIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.emergencyPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    featureText: {
      fontSize: 14,
      color: colors.foreground,
      fontWeight: '500',
      flex: 1,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    backButton: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    nextButton: {
      flex: 2,
      borderRadius: 12,
      minHeight: 52,
    },
    nextButtonInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    nextButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    indicators: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 24,
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    activeIndicator: {
      backgroundColor: colors.emergencyPrimary,
    },
    inactiveIndicator: {
      backgroundColor: colors.muted,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      {currentStep < onboardingSteps.length - 1 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentStep + 1} of {onboardingSteps.length}
            </Text>
            <Progress value={progress} height={4} />
          </View>
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[colors.emergencyPrimary, colors.emergencySecondary]}
            style={styles.iconGradient}
          >
            <Icon name={step.icon as any} size={60} color="#ffffff" />
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.stepContent}>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {step.features.map((feature, index) => (
              <View key={index} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Icon name="check" size={12} color="#ffffff" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Indicators */}
        <View style={styles.indicators}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentStep ? styles.activeIndicator : styles.inactiveIndicator
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep > 0 && (
            <Button
              title="Back"
              onPress={() => setCurrentStep(currentStep - 1)}
              variant="outline"
              style={styles.backButton}
            />
          )}
          <LinearGradient
            colors={[colors.emergencyPrimary, colors.emergencySecondary]}
            style={styles.nextButton}
          >
            <TouchableOpacity
              style={styles.nextButtonInner}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
}
