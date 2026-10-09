import "server-only";

import { notFound, redirect } from "next/navigation";

import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import {
  hasEffectiveCapability,
  type PlatformCapability,
} from "@/features/auth/types/authorization";

export async function requireCapability(capability: PlatformCapability) {
  const account = await getAuthenticatedAccount();

  if (!account) {
    redirect("/login");
  }

  if (
    !hasEffectiveCapability(
      account.role,
      capability,
      account.hasActiveVolunteerProfile,
    )
  ) {
    notFound();
  }

  return account;
}