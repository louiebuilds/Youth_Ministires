import { notFound, redirect } from "next/navigation";

import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import { hasCapability } from "@/features/auth/types/authorization";
import { VisitorCardDetailWorkspace } from "@/features/forms/components/visitor-card-detail";
import { getVisitorCardDetail, listVisitorCardMatches } from "@/features/forms/services/visitor-card-service";

export default async function VisitorCardDetailPage({ params }: { params: Promise<{ visitorCardId: string }> }) {
  const account = await getAuthenticatedAccount();
  if (!account) redirect("/login");
  if (!hasCapability(account.role, "visitor_cards.manage")) notFound();

  const { visitorCardId } = await params;
  const [data, matches] = await Promise.all([
    getVisitorCardDetail(visitorCardId).catch(() => null),
    listVisitorCardMatches(visitorCardId).catch(() => []),
  ]);
  if (!data) notFound();

  return <VisitorCardDetailWorkspace card={data} matches={matches} />;
}