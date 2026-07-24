import "server-only";

import { notFound, redirect } from "next/navigation";

import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import {
  hasCapability,
  type PlatformCapability,
} from "@/features/auth/types/authorization";

export async function requireCapability(capability: PlatformCapability) {
  const account = await getAuthenticatedAccount();

  if (!account) {
    redirect("/login");
  }

  if (!hasCapability(account.role, capability)) {
    notFound();
  }

  return account;
}
