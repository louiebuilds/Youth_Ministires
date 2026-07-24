import { redirect } from "next/navigation";

import { getAuthenticatedUserId } from "@/features/auth/services/session-service";

export default async function HomePage() {
  const userId = await getAuthenticatedUserId();

  redirect(userId ? "/dashboard" : "/login");
}
