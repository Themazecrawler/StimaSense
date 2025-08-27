# Supabase Setup for StimaSense

This directory contains the Supabase configuration and database schema for the StimaSense power outage prediction app.

## Files

- **`SupabaseService.ts`** - TypeScript service for interacting with Supabase
- **`database_schema.sql`** - Complete database schema with tables, indexes, and functions

## Setup Instructions

### 1. Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Use the project URL and anon key provided:
   - **URL**: `https://miklxxtgaglndjizgqnn.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pa2x4eHRnYWdsbmRqaXpncW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjg4NDcsImV4cCI6MjA3MTc0NDg0N30.i57AO--wvjJ7sAZOB--QnOYTVRDbjz4ytipn3t3-1cM`

### 2. Database Setup

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `database_schema.sql`
3. Run the script to create all tables, indexes, and functions

### 3. Enable Extensions

The schema requires these PostgreSQL extensions:
- `uuid-ossp` - For UUID generation
- `postgis` - For geographic queries and spatial indexing

These should be automatically enabled when you run the schema script.

### 4. Storage Buckets

Create the following storage buckets for file uploads:
- `outage-photos` - For outage report photos
- `model-files` - For ML model files

### 5. Authentication Setup

1. Go to **Authentication > Settings** in your Supabase dashboard
2. Configure your authentication providers (email, Google, etc.)
3. Set up email templates for verification and password reset

### 6. Row Level Security (RLS)

The schema automatically enables RLS on all tables with appropriate policies:
- Users can only access their own data
- Outage reports are public for viewing
- Weather data and KPLC outages are public

## Database Tables

### Core Tables
- **`users`** - User profiles and preferences
- **`outage_reports`** - User-submitted outage reports
- **`weather_data`** - Historical weather information
- **`predictions`** - ML model predictions
- **`kplc_planned_outages`** - Scraped KPLC outage data

### ML/Analytics Tables
- **`model_versions`** - Different versions of the ML model
- **`training_sessions`** - Model training history
- **`model_feedback`** - User feedback on predictions

## Key Features

### Geographic Queries
- Spatial indexing using PostGIS
- Functions for finding nearby outages
- Weather data aggregation by location

### Real-time Subscriptions
- Outage report updates
- KPLC outage notifications
- Weather data changes

### Data Validation
- Check constraints on severity levels
- Geographic coordinate validation
- JSONB for flexible metadata storage

## Usage in App

```typescript
import { supabaseService } from '../services/supabase/SupabaseService';

// Get current user
const user = await supabaseService.getCurrentUser();

// Create outage report
const report = await supabaseService.createOutageReport({
  user_id: user.id,
  location_lat: -1.2921,
  location_lng: 36.8219,
  location_address: 'Nairobi, Kenya',
  outage_type: 'unplanned',
  severity: 'high',
  description: 'Power outage in downtown area'
});

// Get nearby outages
const nearbyOutages = await supabaseService.getOutageReports({
  lat: -1.2921,
  lng: 36.8219,
  radius: 5
});
```

## Security

- All tables have Row Level Security enabled
- Users can only access their own data
- Public data (outages, weather) is readable by everyone
- Authentication required for data modification

## Performance

- Spatial indexes on location columns
- Composite indexes on frequently queried fields
- Optimized functions for common queries
- JSONB for flexible metadata storage

## Monitoring

Monitor your Supabase usage in the dashboard:
- **Database** - Query performance and storage
- **Auth** - User signups and sessions
- **Storage** - File uploads and bandwidth
- **Edge Functions** - Serverless function execution

## Troubleshooting

### Common Issues

1. **PostGIS extension not available**
   - Contact Supabase support to enable PostGIS
   - Or use standard PostgreSQL geometry functions

2. **RLS policies too restrictive**
   - Check the policy definitions in the schema
   - Ensure users are properly authenticated

3. **Spatial queries slow**
   - Verify spatial indexes are created
   - Use appropriate radius limits in queries

### Support

- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Supabase Discord](https://discord.supabase.com)

