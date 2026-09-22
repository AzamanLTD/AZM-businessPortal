// =============================================================================
// AZAMAN Business Portal — Business-Type Route Guard
//
// Wraps a Route element and redirects to the dashboard if the current
// business type doesn't match any of the allowed types. This prevents
// users from manually navigating to /transit when their business is a
// restaurant, etc.
//
// Usage:
//   <Route path="/transit" element={
//     <TypeGuardedRoute types={['TRANSIT']}>
//       <TransitTrips />
//     </TypeGuardedRoute>
//   } />
// =============================================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getTypeConfig } from '@/lib/businessTypes';

export function TypeGuardedRoute({ types, children }) {
  const { bizProfile } = useAuth();
  const bizType = bizProfile ? getTypeConfig(bizProfile).type : null;

  // If no type restriction or business type matches, render the page
  if (!types || types.length === 0 || types.includes(bizType)) {
    return children;
  }

  // Otherwise redirect to dashboard
  return <Navigate to="/" replace />;
}
