import React, { useState, useEffect } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/Separator';
import { Avatar } from '../ui/Avatar';
import { Progress } from '../ui/Progress';

interface Alert {
  id: string;
  type: 'outage' | 'prediction' | 'weather' | 'maintenance';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  location: string;
  isRead: boolean;
  estimatedDuration?: string;
  affectedCustomers?: number;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionRequired?: boolean;
}

export default function AlertsScreen() {
  const { colors } = useTheme();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'notifications'>('alerts');

  useEffect(() => {
    loadAlertsAndNotifications();
  }, []);

  const loadAlertsAndNotifications = async () => {
    // Simulate loading data
    const mockAlerts: Alert[] = [
      {
        id: '1',
    type: 'outage',
        title: 'Power Outage Detected',
        message: 'A power outage has been reported in your area. Crews are investigating.',
    severity: 'high',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        location: 'Nairobi West',
        isRead: false,
        estimatedDuration: '2-4 hours',
        affectedCustomers: 1500,
      },
      {
        id: '2',
    type: 'prediction',
        title: 'High Outage Risk',
        message: 'AI predicts 75% chance of outage in the next 6 hours due to weather conditions.',
    severity: 'medium',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        location: 'Nairobi West',
        isRead: true,
        affectedCustomers: 800,
      },
      {
        id: '3',
    type: 'maintenance',
        title: 'Scheduled Maintenance',
        message: 'Planned maintenance work will affect power supply in your area.',
    severity: 'low',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        location: 'Nairobi West',
        isRead: true,
        estimatedDuration: '4 hours',
        affectedCustomers: 2000,
      },
    ];

    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: 'Service Update',
        message: 'Your area has been restored to full power supply.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        isRead: false,
      },
      {
        id: '2',
        type: 'success',
        title: 'Report Submitted',
        message: 'Thank you for your outage report. We have received it and are investigating.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        isRead: true,
      },
      {
        id: '3',
        type: 'warning',
        title: 'Weather Alert',
        message: 'Severe weather conditions may affect power supply in your area.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        isRead: false,
        actionRequired: true,
      },
    ];

    setAlerts(mockAlerts);
    setNotifications(mockNotifications);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlertsAndNotifications();
    setRefreshing(false);
  };

  const markAsRead = (id: string, type: 'alert' | 'notification') => {
    if (type === 'alert') {
      setAlerts(prev => prev.map(alert => 
        alert.id === id ? { ...alert, isRead: true } : alert
      ));
        } else {
      setNotifications(prev => prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      ));
        }
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'outage': return '⚡';
      case 'prediction': return '🤖';
      case 'weather': return '🌦️';
      case 'maintenance': return '🔧';
      default: return '📢';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '📢';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const unreadCount = alerts.filter(a => !a.isRead).length + notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.emergencyPrimary }]}>
        <Text style={[styles.headerTitle, { color: colors.background }]}>Alerts & Notifications</Text>
        {unreadCount > 0 && (
          <Badge variant="secondary" style={styles.unreadBadge}>
            <Text style={{ color: colors.background }}>{unreadCount}</Text>
          </Badge>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'alerts' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[
            styles.tabText,
            { 
              color: activeTab === 'alerts' 
                ? colors.primaryForeground 
                : colors.mutedForeground 
            }
          ]}>
            Alerts ({alerts.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'notifications' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[
            styles.tabText,
            { 
              color: activeTab === 'notifications' 
                ? colors.primaryForeground 
                : colors.mutedForeground 
            }
          ]}>
            Notifications ({notifications.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'alerts' ? (
          <View style={styles.content}>
            {/* Alerts Summary */}
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
                Current Status
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {alerts.filter(a => a.type === 'outage').length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    Active Outages
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.emergencyWarning }]}>
                    {alerts.filter(a => a.type === 'prediction').length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    Predictions
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.emergencySuccess }]}>
                    {alerts.filter(a => a.isRead).length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    Resolved
                  </Text>
                </View>
              </View>
            </Card>

            {/* Alerts List */}
            {alerts.map((alert, index) => (
              <Card key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertTypeContainer}>
                    <Text style={styles.alertTypeIcon}>{getTypeIcon(alert.type)}</Text>
                    <Badge 
                      variant="secondary" 
                      style={{ backgroundColor: getSeverityColor(alert.severity) }}
                    >
                                             <Text style={{ color: colors.primaryForeground }}>
                         {alert.severity.toUpperCase()}
                       </Text>
                     </Badge>
                   </View>
                   <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>
                     {formatTimestamp(alert.timestamp)}
                   </Text>
                 </View>

                 <Text style={[styles.alertTitle, { color: colors.foreground }]}>
                   {alert.title}
                 </Text>
                 
                 <Text style={[styles.alertMessage, { color: colors.mutedForeground }]}>
                   {alert.message}
                 </Text>

                 <View style={styles.alertDetails}>
                   <View style={styles.detailItem}>
                     <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                       Location:
                     </Text>
                     <Text style={[styles.detailValue, { color: colors.foreground }]}>
                       {alert.location}
                     </Text>
                   </View>
                   
                   {alert.estimatedDuration && (
                     <View style={styles.detailItem}>
                       <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                         Duration:
                       </Text>
                       <Text style={[styles.detailValue, { color: colors.foreground }]}>
                         {alert.estimatedDuration}
                       </Text>
                     </View>
                   )}
                   
                   {alert.affectedCustomers && (
                     <View style={styles.detailItem}>
                       <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                         Affected:
                       </Text>
                       <Text style={[styles.detailValue, { color: colors.foreground }]}>
                         {alert.affectedCustomers.toLocaleString()} customers
                       </Text>
                     </View>
                   )}
                 </View>

                {!alert.isRead && (
                  <TouchableOpacity
                    style={styles.markReadButton}
                    onPress={() => markAsRead(alert.id, 'alert')}
                  >
                    <Text style={[styles.markReadText, { color: colors.primary }]}>
                      Mark as Read
                    </Text>
                  </TouchableOpacity>
                )}

                {index < alerts.length - 1 && <Separator />}
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.content}>
            {/* Notifications List */}
            {notifications.map((notification, index) => (
              <Card key={notification.id} style={styles.notificationCard}>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationTypeContainer}>
                    <Text style={styles.notificationTypeIcon}>
                      {getNotificationIcon(notification.type)}
                    </Text>
                                         <Badge 
                       variant="secondary" 
                       style={{ 
                         backgroundColor: notification.actionRequired 
                           ? colors.emergencyWarning 
                           : colors.primary 
                       }}
                     >
                       <Text style={{ color: colors.primaryForeground }}>
                         {notification.actionRequired ? 'ACTION REQUIRED' : 'INFO'}
                       </Text>
                     </Badge>
                   </View>
                   <Text style={[styles.notificationTime, { color: colors.mutedForeground }]}>
                     {formatTimestamp(notification.timestamp)}
                   </Text>
                 </View>

                 <Text style={[styles.notificationTitle, { color: colors.foreground }]}>
                   {notification.title}
                 </Text>
                 
                 <Text style={[styles.notificationMessage, { color: colors.mutedForeground }]}>
                   {notification.message}
                 </Text>

                {!notification.isRead && (
                  <TouchableOpacity
                    style={styles.markReadButton}
                    onPress={() => markAsRead(notification.id, 'notification')}
                  >
                    <Text style={[styles.markReadText, { color: colors.primary }]}>
                      Mark as Read
                    </Text>
                  </TouchableOpacity>
                )}

                {index < notifications.length - 1 && <Separator />}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
      alignItems: 'center',
    position: 'relative',
    },
    headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    },
    tabContainer: {
      flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    },
    tab: {
      flex: 1,
    paddingVertical: 12,
      paddingHorizontal: 16,
    borderRadius: 8,
      alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    tabText: {
      fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
      flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
      fontSize: 12,
    textAlign: 'center',
    },
    alertCard: {
    marginBottom: 16,
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    alignItems: 'center',
      marginBottom: 12,
    },
  alertTypeContainer: {
      flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTypeIcon: {
    fontSize: 20,
  },
  alertTime: {
    fontSize: 12,
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
    },
  alertMessage: {
      fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  alertDetails: {
    marginBottom: 16,
  },
  detailItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  markReadButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  markReadText: {
      fontSize: 14,
      fontWeight: '500',
    },
  alertSeparator: {
    marginTop: 16,
    },
  notificationCard: {
      marginBottom: 16,
    },
  notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    marginBottom: 12,
    },
  notificationTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    gap: 8,
  },
  notificationTypeIcon: {
    fontSize: 20,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationTitle: {
      fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  notificationMessage: {
      fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  notificationSeparator: {
    marginTop: 16,
    },
  });
