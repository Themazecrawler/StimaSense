# React Native Conversion Guide

This guide outlines how to convert the PowerAlert web app to React Native.

## Completed Conversions

✅ **App.tsx** - Main app with React Navigation
✅ **Theme System** - React Native compatible theme context
✅ **Basic UI Components** - Button, Card components
✅ **Sample Screen** - LoginScreen as example
✅ **Package Configuration** - Dependencies and setup

## Components to Convert

### 1. Replace HTML Elements with React Native Components

| Web Element | React Native Component |
|-------------|------------------------|
| `<div>` | `<View>` |
| `<span>`, `<p>` | `<Text>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<TouchableOpacity>` + `<Text>` |
| `<img>` | `<Image>` |
| `<svg>` | `react-native-svg` components |
| `<main>` | `<ScrollView>` or `<View>` |

### 2. Styling Conversion

Replace Tailwind classes with StyleSheet objects:

```tsx
// Web (Tailwind)
<div className="flex items-center justify-center p-4 bg-white rounded-lg">

// React Native
<View style={styles.container}>

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
});
```

### 3. Navigation Conversion

Replace direct navigation calls with React Navigation:

```tsx
// Web
onNavigate('dashboard')

// React Native
navigation.navigate('Dashboard')
```

### 4. UI Components to Convert

Each component in `/components/ui/` needs conversion:

#### Priority Order:
1. **Input.tsx** - Text input component
2. **Badge.tsx** - Small status indicators
3. **Progress.tsx** - Progress bars
4. **Switch.tsx** - Toggle switches
5. **Tabs.tsx** - Tab navigation
6. **Alert.tsx** - Alert messages
7. **Avatar.tsx** - User profile images
8. **Separator.tsx** - Divider lines

#### Example Input Component:
```tsx
// components/ui/Input.tsx
import React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  // ... other props
}

export function Input({ value, onChangeText, placeholder, ...props }: InputProps) {
  const { colors } = useTheme();
  
  return (
    <TextInput
      style={[styles.input, { backgroundColor: colors.input, color: colors.foreground }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
});
```

### 5. Screens to Convert

#### Authentication Screens:
- ✅ **LoginScreen.tsx** - Complete
- **RegisterScreen.tsx** - Convert form inputs and validation

#### Main Screens:
- **DashboardScreen.tsx** - Convert cards, widgets, and status indicators
- **MapScreen.tsx** - Integrate `react-native-maps`
- **AnalyticsScreen.tsx** - Convert charts to `react-native-chart-kit`
- **AlertsScreen.tsx** - Convert alert lists and filters
- **ProfileScreen.tsx** - Convert settings sections
- **ReportOutageScreen.tsx** - Convert form and camera integration

### 6. Platform-Specific Features

#### Location Services:
```tsx
import * as Location from 'expo-location';

const getLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;
  
  const location = await Location.getCurrentPositionAsync({});
  return location;
};
```

#### Camera Integration:
```tsx
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
};
```

#### Push Notifications:
```tsx
import * as Notifications from 'expo-notifications';

const scheduleNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { seconds: 1 },
  });
};
```

### 7. Data Management

#### AsyncStorage (replacing localStorage):
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store data
await AsyncStorage.setItem('key', 'value');

// Retrieve data
const value = await AsyncStorage.getItem('key');

// Remove data
await AsyncStorage.removeItem('key');
```

### 8. Charts and Visualizations

Replace Recharts with react-native-chart-kit:

```tsx
import { LineChart } from 'react-native-chart-kit';

<LineChart
  data={{
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ data: [20, 45, 28, 80, 99, 43] }],
  }}
  width={screenWidth}
  height={220}
  chartConfig={{
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    color: (opacity = 1) => colors.emergencyPrimary + opacity.toString(16),
  }}
/>
```

### 9. Icons

Replace Lucide React with React Native Vector Icons:

```tsx
import Icon from 'react-native-vector-icons/Feather';

// Usage
<Icon name="zap" size={24} color={colors.emergencyPrimary} />
```

### 10. Gradients

Replace CSS gradients with LinearGradient:

```tsx
import LinearGradient from 'react-native-linear-gradient';

<LinearGradient
  colors={[colors.emergencyPrimary, colors.emergencySecondary]}
  style={styles.gradient}
>
  {/* Content */}
</LinearGradient>
```

## Installation and Setup

1. **Install dependencies:**
```bash
npm install
# or
yarn install
```

2. **For iOS:**
```bash
cd ios && pod install
```

3. **Run the app:**
```bash
npm run ios
npm run android
```

## Key Differences from Web

1. **No CSS Classes** - Use StyleSheet.create()
2. **No DOM Events** - Use React Native gesture handlers
3. **Platform APIs** - Use Expo/React Native modules
4. **Navigation** - React Navigation instead of state-based routing
5. **Styling** - Flexbox by default, different layout system
6. **Performance** - Consider FlatList for long lists
7. **Images** - Use Image component with proper source handling

## Testing

- Test on both iOS and Android
- Test different screen sizes
- Test dark/light mode switching
- Test offline functionality
- Test location permissions
- Test camera permissions
- Test push notifications

## Next Steps

1. Convert remaining UI components
2. Convert all screens following the LoginScreen pattern
3. Integrate native modules (maps, camera, notifications)
4. Add proper error handling and loading states
5. Implement proper navigation flows
6. Add unit and integration tests
7. Configure app icons and splash screens
8. Set up build configurations for app stores