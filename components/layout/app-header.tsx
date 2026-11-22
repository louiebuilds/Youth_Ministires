
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { UserMenu } from "@/components/layout/user-menu";
import type { NavigationItem } from "@/config/navigation-config";
import { getMinistryDisplayName } from "@/features/administration/services/ministry-settings-service";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import {
  getHeaderUnreadCount,
  listHeaderNotifications,
} from "@/features/notifications/services/header-notification-service";

type AppHeaderProps = Readonly<{
  email: string;
  navigation: readonly NavigationItem[];
  roleLabel: string;
}>;

export async function AppHeader({
  email,
  navigation,
  roleLabel,
}: AppHeaderProps) {
  const [ministryDisplayName, notifications, unreadCount] =
    await Promise.all([
      getMinistryDisplayName(),
      listHeaderNotifications(),
      getHeaderUnreadCount(),
    ]);

  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur"
      data-app-header
    >
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNavigation navigation={navigation} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              {ministryDisplayName}
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              Ministry platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
          />
          <UserMenu email={email} roleLabel={roleLabel} />
        </div>
      </div>
    </header>
  );
}
