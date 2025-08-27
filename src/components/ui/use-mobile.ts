import * as React from 'react';

// In React Native there is no window matchMedia – assume mobile layout.
export function useIsMobile() {
  return true;
}
