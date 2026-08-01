import { Outlet, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Shell, CommandPalette, TooltipProvider, ToastProvider as ForgeToast } from '@/components/forge';
import { CommandProvider } from '@/lib/command';
import { ThemeProvider } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useBizNotifications } from '@/hooks/useBizNotifications';

export function ForgeLayout() {
  const { bizProfile, isOwner, user, logout } = useAuth();
  const { hasPermission } = usePermission();
  const { data: notifData } = useBizNotifications();
  const navigate = useNavigate();

  const navProps = useMemo(() => ({
    businessType: bizProfile?.business_type || 'GENERAL',
    hasPermission,
    isOwner,
    counts: {
      notifications: notifData?.unreadCount,
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
  }), [bizProfile, hasPermission, isOwner, notifData]);

  return (
    <ThemeProvider>
      <CommandProvider>
        <TooltipProvider>
          <ForgeToast>
            <Shell
              navProps={navProps}
              brandName={bizProfile?.name || 'Azaman'}
              brandShort={(bizProfile?.name || 'AZ').slice(0, 2).toUpperCase()}
              user={user}
              onLogout={logout}
              onNavigateSettings={() => navigate('/settings')}
            >
              <Outlet />
            </Shell>
            <CommandPalette navProps={navProps} />
          </ForgeToast>
        </TooltipProvider>
      </CommandProvider>
    </ThemeProvider>
  );
}
