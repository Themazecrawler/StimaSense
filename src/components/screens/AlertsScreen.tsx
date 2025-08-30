import React, { useState } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';

interface AlertsScreenProps {
  onNavigate: (screen: string) => void;
}

const activeAlerts = [
  {
    id: 1,
    type: 'outage',
    severity: 'high',
    title: 'Power Outage in Progress',
    description: 'Affecting Downtown District - 1,200 customers without power',
    location: 'Downtown District',
    time: '2 hours ago',
    duration: '2h 15m',
    affected: 1200,
    status: 'ongoing',
    icon: 'zap'
  },
  {
    id: 2,
    type: 'weather',
    severity: 'medium',
    title: 'Storm Warning',
    description: 'Severe thunderstorm approaching. High risk of power outages in next 4 hours.',
    location: 'Bay Area',
    time: '30 min ago',
    duration: 'Next 4 hours',
    affected: 0,
    status: 'predicted',
    icon: 'cloud-rain'
  },
  {
    id: 3,
    type: 'prediction',
    severity: 'medium',
    title: 'AI Outage Prediction',
    description: 'High probability of outage in Mission Bay due to equipment maintenance',
    location: 'Mission Bay',
    time: '1 hour ago',
    duration: 'Tomorrow 2-4 PM',
    affected: 340,
    status: 'predicted',
    icon: 'alert-circle'
  }
];

const pastAlerts = [
  {
    id: 4,
    type: 'outage',
    severity: 'low',
    title: 'Power Restored',
    description: 'All customers in Castro District have power restored',
    location: 'Castro District',
    time: '3 hours ago',
    duration: '45 minutes',
    affected: 890,
    status: 'resolved',
    icon: 'check-circle'
  },
  {
    id: 5,
    type: 'maintenance',
    severity: 'low',
    title: 'Scheduled Maintenance Complete',
    description: 'Planned maintenance in Nob Hill completed ahead of schedule',
    location: 'Nob Hill',
    time: '1 day ago',
    duration: '2 hours',
    affected: 150,
    status: 'completed',
    icon: 'settings'
  },
  {
    id: 6,
    type: 'weather',
    severity: 'medium',
    title: 'Wind Advisory Ended',
    description: 'High wind conditions have subsided. No outages reported.',
    location: 'San Francisco',
    time: '2 days ago',
    duration: '6 hours',
    affected: 0,
    status: 'resolved',
    icon: 'wind'
  }
];

const emergencyContacts = [
  {
    name: 'PG&E Outage Hotline',
    type: 'utility',
    phone: '1-800-743-5000',
    description: 'Report outages and get updates',
    available: '24/7',
    icon: 'zap'
  },
  {
    name: 'San Francisco Emergency',
    type: 'emergency',
    phone: '911',
    description: 'Life-threatening emergencies only',
    available: '24/7',
    icon: 'alert-triangle'
  },
  {
    name: 'Non-Emergency Services',
    type: 'services',
    phone: '311',
    description: 'Non-urgent city services',
    available: '24/7',
    icon: 'phone'
  },
  {
    name: 'Red Cross Emergency',
    type: 'support',
    phone: '1-800-733-2767',
    description: 'Emergency shelter and assistance',
    available: '24/7',
    icon: 'users'
  }
];

export function AlertsScreen({ onNavigate }: AlertsScreenProps) {
  const { colors } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => {
        console.error('Error making phone call:', err);
        Alert.alert('Error', 'Unable to make phone call');
      });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return colors.powerOff;
      case 'medium': return colors.powerUnstable;
      case 'low': return colors.powerOn;
      default: return colors.mutedForeground;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return colors.powerOff;
      case 'predicted': return colors.powerUnstable;
      case 'resolved': return colors.powerOn;
      case 'completed': return colors.powerOn;
      default: return colors.mutedForeground;
    }
  };

  const filterOptions = [
    { id: 'all', label: 'All', count: activeAlerts.length },
    { id: 'outage', label: 'Outages', count: activeAlerts.filter(a => a.type === 'outage').length },
    { id: 'weather', label: 'Weather', count: activeAlerts.filter(a => a.type === 'weather').length },
    { id: 'prediction', label: 'Predictions', count: activeAlerts.filter(a => a.type === 'prediction').length }
  ];

  const filteredAlerts = selectedFilter === 'all' 
    ? activeAlerts 
    : activeAlerts.filter(alert => alert.type === selectedFilter);

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
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#ffffff',
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 4,
    },
    notificationToggle: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      padding: 16,
    },
    toggleContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    toggleText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 16,
    },
    toggleSubtext: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 14,
      marginTop: 2,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 4,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      borderRadius: 6,
    },
    activeTab: {
      backgroundColor: colors.background,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.mutedForeground,
    },
    activeTabText: {
      color: colors.foreground,
    },
    filterContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    activeFilterButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      fontSize: 12,
      color: colors.foreground,
    },
    activeFilterButtonText: {
      color: '#ffffff',
    },
    alertCard: {
      marginBottom: 12,
      borderWidth: 1,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    alertContent: {
      padding: 16,
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    alertLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      flex: 1,
    },
    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertInfo: {
      flex: 1,
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    alertDescription: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 8,
    },
    alertMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    alertFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    durationText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    contactCard: {
      marginBottom: 16,
    },
    contactItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.muted + '20',
      borderRadius: 8,
      marginBottom: 8,
    },
    contactLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    contactIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.emergencyPrimary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.foreground,
      marginBottom: 2,
    },
    contactDescription: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    contactBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Alerts & Notifications</Text>
            <Text style={styles.headerSubtitle}>{activeAlerts.length} active alerts</Text>
          </View>
          <TouchableOpacity
            onPress={() => setSoundEnabled(!soundEnabled)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon 
              name={soundEnabled ? 'volume-2' : 'volume-x'} 
              size={20} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        </View>

        {/* Notification Toggle */}
        <View style={styles.notificationToggle}>
          <View style={styles.toggleContent}>
            <View style={styles.toggleLeft}>
              <Icon name="bell" size={20} color="#ffffff" />
              <View>
                <Text style={styles.toggleText}>Push Notifications</Text>
                <Text style={styles.toggleSubtext}>Receive alerts on your device</Text>
              </View>
            </View>
              <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Tabs */}
        <View style={styles.tabContainer}>
          {['active', 'history', 'contacts'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText, 
                activeTab === tab && styles.activeTabText
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'active' && (
          <>
            {/* Alert Filters */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
            >
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterButton,
                    selectedFilter === option.id && styles.activeFilterButton
                  ]}
                  onPress={() => setSelectedFilter(option.id)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === option.id && styles.activeFilterButtonText
                  ]}>
                  {option.label}
                    {option.count > 0 && ` (${option.count})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Active Alerts List */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} style={{
                  ...(styles.alertCard as any),
                  borderColor: getSeverityColor(alert.severity)
                }}>
                  <CardContent style={styles.alertContent}>
                    <View style={styles.alertHeader}>
                      <View style={styles.alertLeft}>
                        <View style={[
                          styles.alertIcon,
                          { backgroundColor: getSeverityColor(alert.severity) + '20' }
                        ]}>
                          <Icon 
                            name={alert.icon as any} 
                            size={20} 
                            color={getSeverityColor(alert.severity)} 
                          />
                        </View>
                        <View style={styles.alertInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Text style={styles.alertTitle}>{alert.title}</Text>
                            <Badge variant={getSeverityBadge(alert.severity) as any}>
                                {alert.severity}
                              </Badge>
                          </View>
                          <Text style={styles.alertDescription}>{alert.description}</Text>
                          <View style={styles.alertMeta}>
                            <View style={styles.metaItem}>
                              <Icon name="map-pin" size={12} color={colors.mutedForeground} />
                              <Text style={styles.metaText}>{alert.location}</Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Icon name="clock" size={12} color={colors.mutedForeground} />
                              <Text style={styles.metaText}>{alert.time}</Text>
                            </View>
                              {alert.affected > 0 && (
                              <View style={styles.metaItem}>
                                <Icon name="users" size={12} color={colors.mutedForeground} />
                                <Text style={styles.metaText}>{alert.affected.toLocaleString()} affected</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity>
                        <Icon name="share-2" size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.alertFooter}>
                      <View style={styles.statusContainer}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: getStatusColor(alert.status) }
                        ]} />
                        <Text style={[
                          styles.statusText,
                          { color: getStatusColor(alert.status) }
                        ]}>
                            {alert.status}
                        </Text>
                        <Text style={styles.durationText}> • {alert.duration}</Text>
                      </View>
                      <Button title="View Details" variant="outline" size="sm" onPress={() => {}} />
                    </View>
                  </CardContent>
                </Card>
              ))}
            </ScrollView>
          </>
        )}

        {activeTab === 'history' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {pastAlerts.map((alert) => (
              <Card key={alert.id} style={styles.alertCard}>
                <CardContent style={styles.alertContent}>
                  <View style={styles.alertLeft}>
                    <View style={[styles.alertIcon, { backgroundColor: colors.muted }]}>
                      <Icon name={alert.icon as any} size={16} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.alertInfo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.alertTitle}>{alert.title}</Text>
                        <Text style={styles.metaText}>{alert.time}</Text>
                      </View>
                      <Text style={styles.alertDescription}>{alert.description}</Text>
                      <View style={styles.alertMeta}>
                        <View style={styles.metaItem}>
                          <Icon name="map-pin" size={12} color={colors.mutedForeground} />
                          <Text style={styles.metaText}>{alert.location}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Icon name="clock" size={12} color={colors.mutedForeground} />
                          <Text style={styles.metaText}>Duration: {alert.duration}</Text>
                        </View>
                        {alert.affected > 0 && (
                          <View style={styles.metaItem}>
                            <Icon name="users" size={12} color={colors.mutedForeground} />
                            <Text style={styles.metaText}>{alert.affected.toLocaleString()}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </ScrollView>
        )}

        {activeTab === 'contacts' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Emergency Contact Integration */}
            <Card style={styles.contactCard}>
              <CardHeader>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                  Emergency Contacts
                </Text>
                <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
                  Quick access to utility companies and emergency services
                </Text>
              </CardHeader>
              <CardContent>
                {emergencyContacts.map((contact) => (
                  <View key={contact.name} style={styles.contactItem}>
                    <View style={styles.contactLeft}>
                      <View style={styles.contactIcon}>
                        <Icon name={contact.icon as any} size={20} color={colors.emergencyPrimary} />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactDescription}>{contact.description}</Text>
                        <View style={styles.contactBadges}>
                          <Badge variant="outline">
                              {contact.available}
                            </Badge>
                          <Badge variant="secondary">
                              {contact.type}
                            </Badge>
                        </View>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <Button title="Call" variant="outline" size="sm" onPress={() => handleCall(contact.phone)} />
                      <TouchableOpacity
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          backgroundColor: colors.muted + '40'
                        }}
                        onPress={() => {}}
                      >
                        <Icon name="more-horizontal" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </CardContent>
            </Card>

            {/* Alert Sharing Options */}
            <Card style={styles.contactCard}>
              <CardHeader>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                  Alert Sharing Options
                </Text>
                <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4 }}>
                  Share alerts with family and friends
                </Text>
              </CardHeader>
              <CardContent>
                <Button title="Share Current Alert" variant="outline" style={{ marginBottom: 8 }} onPress={() => {}} />
                <Button title="Add Emergency Contact" variant="outline" style={{ marginBottom: 8 }} onPress={() => {}} />
                <Button title="Sharing Preferences" variant="outline" onPress={() => {}} />
              </CardContent>
            </Card>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}