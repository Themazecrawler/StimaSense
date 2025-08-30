import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../contexts/ThemeContext';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export function ProfileScreen({ onNavigate, onToggleTheme, isDark }: ProfileScreenProps) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState({
    outageAlerts: true,
    predictions: true,
    communityReports: false,
    weatherAlerts: true,
    push: true,
    email: false,
    sms: true
  });

  const [location, setLocation] = useState({
    autoDetect: true,
    shareLocation: true,
    preciseLocation: false
  });

  const [dataSettings, setDataSettings] = useState({
    offlineSync: true,
    autoDownload: false,
    lowDataMode: false
  });

  const userInfo = {
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    location: 'San Francisco, CA',
    joinDate: 'March 2024',
    reportsSubmitted: 12,
    accuracyRating: 94
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.emergencyPrimary,
      padding: 16,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    avatarContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      overflow: 'hidden',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 20,
      fontWeight: '600',
      color: '#ffffff',
    },
    userEmail: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 2,
    },
    badgeContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    editButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    cardSpacing: {
      marginBottom: 24,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    cardDescription: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.foreground,
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    buttonContainer: {
      marginTop: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Avatar size={64} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userInfo.name}</Text>
            <Text style={styles.userEmail}>{userInfo.email}</Text>
            <View style={styles.badgeContainer}>
              <Badge variant="secondary" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                <Text style={{ color: '#ffffff' }}>{userInfo.reportsSubmitted} Reports</Text>
              </Badge>
              <Badge variant="secondary" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                <Text style={{ color: '#ffffff' }}>{userInfo.accuracyRating}% Accuracy</Text>
              </Badge>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Icon name="edit" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Info */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="user" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Profile Information</Text>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Location</Text>
                <Text style={styles.settingSubtitle}>{userInfo.location}</Text>
              </View>
              <Button title="Update" variant="outline" size="sm" onPress={() => {}} />
            </View>
            <Separator />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{userInfo.joinDate}</Text>
            </View>
          </CardContent>
        </Card>

        {/* Location Settings */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="map-pin" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Location Settings</Text>
            </View>
            <Text style={styles.cardDescription}>Manage how your location is used</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Auto-detect location</Text>
                <Text style={styles.settingSubtitle}>Automatically detect your current location</Text>
              </View>
              <Switch
                value={location.autoDetect}
                onValueChange={(checked) => setLocation({ ...location, autoDetect: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Share with community</Text>
                <Text style={styles.settingSubtitle}>Help improve predictions for your area</Text>
              </View>
              <Switch
                value={location.shareLocation}
                onValueChange={(checked) => setLocation({ ...location, shareLocation: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Precise location</Text>
                <Text style={styles.settingSubtitle}>Use GPS for exact coordinates</Text>
              </View>
              <Switch
                value={location.preciseLocation}
                onValueChange={(checked) => setLocation({ ...location, preciseLocation: checked })}
              />
            </View>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="bell" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Notification Preferences</Text>
            </View>
            <Text style={styles.cardDescription}>Choose what alerts you want to receive</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Outage Alerts</Text>
                <Text style={styles.settingSubtitle}>Current and predicted outages in your area</Text>
              </View>
              <Switch
                value={notifications.outageAlerts}
                onValueChange={(checked) => setNotifications({ ...notifications, outageAlerts: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>AI Predictions</Text>
                <Text style={styles.settingSubtitle}>New prediction updates</Text>
              </View>
              <Switch
                value={notifications.predictions}
                onValueChange={(checked) => setNotifications({ ...notifications, predictions: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Community Reports</Text>
                <Text style={styles.settingSubtitle}>New reports from nearby users</Text>
              </View>
              <Switch
                value={notifications.communityReports}
                onValueChange={(checked) => setNotifications({ ...notifications, communityReports: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Weather Alerts</Text>
                <Text style={styles.settingSubtitle}>Severe weather that may cause outages</Text>
              </View>
              <Switch
                value={notifications.weatherAlerts}
                onValueChange={(checked) => setNotifications({ ...notifications, weatherAlerts: checked })}
              />
            </View>
            
            <Separator />
            <Text style={[styles.settingTitle, { marginTop: 16, marginBottom: 12 }]}>Delivery Methods</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="smartphone" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                  <Text style={styles.settingSubtitle}>Push Notifications</Text>
                </View>
              </View>
                <Switch
                value={notifications.push}
                onValueChange={(checked) => setNotifications({ ...notifications, push: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="mail" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                  <Text style={styles.settingSubtitle}>Email</Text>
                </View>
              </View>
                <Switch
                value={notifications.email}
                onValueChange={(checked) => setNotifications({ ...notifications, email: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="message-square" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                  <Text style={styles.settingSubtitle}>SMS</Text>
                </View>
              </View>
                <Switch
                value={notifications.sms}
                onValueChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                />
            </View>
          </CardContent>
        </Card>

        {/* Theme Toggle */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon 
                name={isDark ? "moon" : "sun"} 
                size={16} 
                color={colors.foreground} 
                style={{ marginRight: 8 }} 
              />
              <Text style={styles.cardTitle}>Appearance</Text>
            </View>
            <Text style={styles.cardDescription}>Customize the app's appearance</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingSubtitle}>
                  {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={onToggleTheme}
              />
            </View>
          </CardContent>
        </Card>

        {/* Data Usage Settings */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="database" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Data Usage Settings</Text>
            </View>
            <Text style={styles.cardDescription}>Manage how the app uses your data</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Low Data Mode</Text>
                <Text style={styles.settingSubtitle}>Reduce data usage when possible</Text>
              </View>
              <Switch
                value={dataSettings.lowDataMode}
                onValueChange={(checked) => setDataSettings({ ...dataSettings, lowDataMode: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Auto Download Maps</Text>
                <Text style={styles.settingSubtitle}>Download map data for offline use</Text>
              </View>
              <Switch
                value={dataSettings.autoDownload}
                onValueChange={(checked) => setDataSettings({ ...dataSettings, autoDownload: checked })}
              />
            </View>
          </CardContent>
        </Card>

        {/* Offline Data Management */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="wifi" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Offline Data Management</Text>
            </View>
            <Text style={styles.cardDescription}>Control offline data and sync settings</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Offline Sync</Text>
                <Text style={styles.settingSubtitle}>Sync data when connection is restored</Text>
              </View>
              <Switch
                value={dataSettings.offlineSync}
                onValueChange={(checked) => setDataSettings({ ...dataSettings, offlineSync: checked })}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Cached Data</Text>
                <Text style={styles.settingSubtitle}>2.3 MB stored locally</Text>
              </View>
              <Button title="Clear Cache" variant="outline" size="sm" onPress={() => {}} />
            </View>
          </CardContent>
        </Card>

        {/* Export Personal Data */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="download" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Export Personal Data</Text>
            </View>
            <Text style={styles.cardDescription}>Download your data and reports</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.buttonContainer}>
              <Button title="Export Report History" variant="outline" style={{ marginBottom: 8 }} onPress={() => {}} />
              <Button title="Export Account Data" variant="outline" onPress={() => {}} />
            </View>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="help-circle" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Help & Support</Text>
            </View>
          </CardHeader>
          <CardContent>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>FAQ</Text>
                <Text style={styles.settingSubtitle}>Frequently asked questions</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Contact Support</Text>
                <Text style={styles.settingSubtitle}>Get help with the app</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingSubtitle}>How we handle your data</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Terms of Service</Text>
                <Text style={styles.settingSubtitle}>App usage terms</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* App Version Info */}
        <Card style={styles.cardSpacing}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="info" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>App Information</Text>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>2.1.0 (Build 145)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>Jan 15, 2025</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AI Model Version</Text>
              <Text style={styles.infoValue}>v3.2.1</Text>
            </View>
            <View style={styles.buttonContainer}>
              <Button title="Check for Updates" variant="outline" size="sm" onPress={() => {}} />
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}