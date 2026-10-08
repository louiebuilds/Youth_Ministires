import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { UserMenu } from "@/components/layout/user-menu";
import type { NavigationItem } from "@/config/navigation-config";
import { getMinistryDisplayName } from "@/features/administration/services/ministry-settings-service";

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
  const ministryDisplayName = await getMinistryDisplayName();

  return (
    <header className="relative z-30 border-b border-slate-200 bg-white">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNavigation navigation={navigation} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              {ministryDisplayName}
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              Ministry platform
            </p>
          </div>
        </div>

        <UserMenu email={email} roleLabel={roleLabel} />
      </div>
    </header>
  );
}
