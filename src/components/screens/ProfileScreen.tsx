import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../backend/supabase/SupabaseService';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Separator } from '../ui/Separator';
import { Switch } from '../ui/Switch';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  location?: string;
  phone?: string;
  created_at: string;
  avatar_url?: string;
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let profileData = null;
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error loading profile:', error);
          } else {
            profileData = data;
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Continue with default profile
        }

        const userProfile: UserProfile = {
          id: user.id,
          email: user.email || '',
          full_name: profileData?.full_name || user.user_metadata?.full_name || 'User',
          location: profileData?.location || 'Nairobi, Kenya',
          phone: profileData?.phone || '',
          created_at: user.created_at,
        };

        setProfile(userProfile);
        setEditedProfile(userProfile);
      } else {
        // Create a default profile if no user
        const defaultProfile: UserProfile = {
          id: 'default',
          email: 'user@example.com',
          full_name: 'Demo User',
          location: 'Nairobi, Kenya',
          phone: '',
          created_at: new Date().toISOString(),
        };
        setProfile(defaultProfile);
        setEditedProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Set fallback profile
      const fallbackProfile: UserProfile = {
        id: 'fallback',
        email: 'user@example.com',
        full_name: 'Demo User',
        location: 'Nairobi, Kenya',
        phone: '',
        created_at: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      setEditedProfile(fallbackProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          full_name: editedProfile.full_name,
          location: editedProfile.location,
          phone: editedProfile.phone,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      setProfile({ ...profile, ...editedProfile });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.foreground }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.foreground }]}>Failed to load profile</Text>
          <Button title="Retry" onPress={loadUserProfile} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.emergencyPrimary }]}>
        <Text style={[styles.headerTitle, { color: colors.background }]}>Profile</Text>
          </View>

          {/* Profile Info */}
          <View style={styles.profileSection}>
            <Avatar 
              size={80} 
              source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
              fallback={profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
            />
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {profile.full_name || 'No name set'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
              {profile.email}
            </Text>
          </View>

          {/* Profile Details */}
          <Card style={styles.detailsCard}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.border 
                  }]}
                  value={editedProfile.full_name || ''}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, full_name: text })}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.mutedForeground}
                />
              ) : (
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  {profile.full_name || 'Not set'}
                </Text>
              )}
            </View>

            <Separator />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Location</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.border 
                  }]}
                  value={editedProfile.location || ''}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, location: text })}
                  placeholder="Enter your location"
                  placeholderTextColor={colors.mutedForeground}
                />
              ) : (
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  {profile.location || 'Not set'}
                </Text>
              )}
            </View>

            <Separator />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Phone</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.border 
                  }]}
                  value={editedProfile.phone || ''}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, phone: text })}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  {profile.phone || 'Not set'}
                </Text>
              )}
            </View>

            <Separator />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Member Since</Text>
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                {new Date(profile.created_at).toLocaleDateString()}
              </Text>
            </View>
          </Card>

          {/* Settings */}
          <Card style={styles.settingsCard}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Push Notifications</Text>
                <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                  Receive alerts about power outages
                </Text>
              </View>
              <Switch value={true} onValueChange={() => {}} />
            </View>

            <Separator />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Location Services</Text>
                <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                  Get personalized outage alerts
                </Text>
              </View>
              <Switch value={true} onValueChange={() => {}} />
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isEditing ? (
              <>
                <Button 
                  title="Save Changes" 
                  onPress={handleSave}
                  style={styles.saveButton}
                />
                <Button 
                  title="Cancel" 
                  onPress={handleCancel}
                  variant="outline"
                  style={styles.cancelButton}
                />
              </>
            ) : (
              <Button 
                title="Edit Profile" 
                onPress={() => setIsEditing(true)}
                style={styles.editButton}
              />
            )}
            
            <Button 
              title="Sign Out" 
              onPress={handleSignOut}
              variant="outline"
              style={styles.signOutButton}
            />
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
    header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileSection: {
      alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  detailsCard: {
    margin: 20,
    marginTop: 0,
  },
  settingsCard: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  infoText: {
      fontSize: 16,
    paddingVertical: 10,
  },
  settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    paddingVertical: 16,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
  settingLabel: {
      fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    },
  settingDescription: {
      fontSize: 14,
  },
  actionButtons: {
    padding: 20,
    paddingTop: 0,
  },
  editButton: {
    marginBottom: 12,
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
      marginBottom: 12,
    },
  signOutButton: {
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    },
  });

