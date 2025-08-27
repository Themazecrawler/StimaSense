# UI Components for StimaSense React Native

This directory contains UI components optimized for React Native.

## Component Status

### ✅ React Native Compatible Components (Keep)
These components have been adapted for React Native:
- `Avatar.tsx` - Avatar component with image fallback
- `Badge.tsx` - Badge/label component  
- `Button.tsx` - Primary button component
- `Card.tsx` - Card container with header/content
- `Input.tsx` - Text input component
- `Progress.tsx` - Progress bar component
- `Switch.tsx` - Toggle switch component
- `utils.ts` - Utility functions
- `use-mobile.ts` - Mobile detection hook

### ❌ Web-Only Components (Remove)
These shadcn components are not compatible with React Native:
- `accordion.tsx` - Use React Native Collapsible instead
- `alert-dialog.tsx` - Use React Native Alert instead
- `alert.tsx` - Use React Native Alert instead
- `aspect-ratio.tsx` - Use React Native Dimensions instead
- `avatar.tsx` - Duplicate of Avatar.tsx
- `badge.tsx` - Duplicate of Badge.tsx
- `breadcrumb.tsx` - Not needed in mobile navigation
- `button.tsx` - Duplicate of Button.tsx
- `calendar.tsx` - Use React Native DateTimePicker instead
- `card.tsx` - Duplicate of Card.tsx
- `carousel.tsx` - Use React Native carousel libraries
- `chart.tsx` - Use React Native chart libraries
- `checkbox.tsx` - Use React Native checkbox libraries
- `collapsible.tsx` - Use React Native Collapsible instead
- `command.tsx` - Not applicable in mobile
- `context-menu.tsx` - Use React Native context menu
- `dialog.tsx` - Use React Native Modal instead
- `drawer.tsx` - Use React Native drawer navigation
- `dropdown-menu.tsx` - Use React Native Picker instead
- `form.tsx` - Use React Native form libraries
- `hover-card.tsx` - No hover concept in mobile
- `input-otp.tsx` - Create custom React Native version
- `input.tsx` - Duplicate of Input.tsx
- `label.tsx` - Use React Native Text instead
- `menubar.tsx` - Not applicable in mobile
- `navigation-menu.tsx` - Use React Navigation instead
- `pagination.tsx` - Use React Native pagination
- `popover.tsx` - Use React Native Modal instead
- `progress.tsx` - Duplicate of Progress.tsx
- `radio-group.tsx` - Use React Native radio libraries
- `resizable.tsx` - Not applicable in mobile
- `scroll-area.tsx` - Use React Native ScrollView
- `select.tsx` - Use React Native Picker instead
- `separator.tsx` - Use React Native View with border
- `sheet.tsx` - Use React Native Modal instead
- `sidebar.tsx` - Use React Native drawer navigation
- `skeleton.tsx` - Create custom React Native version
- `slider.tsx` - Use React Native Slider instead
- `sonner.tsx` - Use React Native toast libraries
- `switch.tsx` - Duplicate of Switch.tsx
- `table.tsx` - Use React Native FlatList instead
- `tabs.tsx` - Use React Native tab navigation
- `textarea.tsx` - Use React Native TextInput multiline
- `toggle-group.tsx` - Create custom React Native version
- `toggle.tsx` - Use React Native switch/button
- `tooltip.tsx` - Not applicable in mobile

## Migration Notes

For removed components, use these React Native alternatives:
- **Alerts**: React Native `Alert` API
- **Modals**: React Native `Modal` component
- **Navigation**: React Navigation library
- **Forms**: React Hook Form with React Native
- **Charts**: Victory Native or React Native Chart Kit
- **Date/Time**: React Native DateTimePicker
- **Carousels**: react-native-snap-carousel