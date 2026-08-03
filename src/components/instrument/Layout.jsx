import { Outlet, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Shell, CommandPalette, TooltipProvider, ProfileMenu } from '@/components/instrument';
import { CommandProvider } from '@/lib/command';
import { ThemeProvider } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import { getBusinessType } from '@/lib/businessTypes';
import { usePermission } from '@/hooks/usePermission';
import { useBizNotifications } from '@/hooks/useBizNotifications';

export function Layout() {
  const { bizProfile, isOwner, user, logout, isAdmin } = useAuth();
  const { hasPermission } = usePermission();
  const { data: notifData } = useBizNotifications();
  const navigate = useNavigate();

  const navProps = useMemo(() => ({
    businessType: getBusinessType(bizProfile?.category || bizProfile?.businessType || bizProfile?.business_type || 'GENERAL'),
    hasPermission,
    isOwner,
    isAdmin,
    bizProfile,
    counts: {
      notifications: notifData?.count ?? notifData?.unreadCount,
      reservationsPending: notifData?.reservationsPending,
      ordersOpen: notifData?.ordersOpen,
      arrivalsToday: notifData?.arrivalsToday,
      roomsDirty: notifData?.roomsDirty,
      ticketsOpen: notifData?.ticketsOpen,
      tripsToday: notifData?.tripsToday,
      payoutsPending: notifData?.payoutsPending,
      disputes: notifData?.disputes,
      timeOffPending: notifData?.timeOffPending,
      kybAction: notifData?.kybAction,
    },
  }), [bizProfile, hasPermission, isOwner, isAdmin, notifData]);

  return (
    <ThemeProvider>
      <CommandProvider>
        <TooltipProvider>
          <Shell
            navProps={navProps}
            brandName={bizProfile?.businessName || 'Azaman'}
            brandShort={(bizProfile?.businessName || 'AZ').slice(0, 2).toUpperCase()}
            user={user}
            onLogout={logout}
            onNavigateSettings={() => navigate('/settings')}
            ProfileMenu={ProfileMenu}
          >
            <Outlet />
          </Shell>
          <CommandPalette navProps={navProps} />
        </TooltipProvider>
      </CommandProvider>
    </ThemeProvider>
  );
}
