import { notFound, redirect } from "next/navigation";

import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import { VisitorCardsWorkspace } from "@/features/forms/components/visitor-cards-workspace";
import { listVisitorCardEvents, listVisitorCards } from "@/features/forms/services/visitor-card-service";
import { hasCapability } from "@/features/auth/types/authorization";

export default async function VisitorsPage() {
  const account = await getAuthenticatedAccount();
  if (!account) redirect("/login");
  if (!hasCapability(account.role, "visitor_cards.manage")) notFound();

  const [cards, events] = await Promise.all([
    listVisitorCards(),
    listVisitorCardEvents(),
  ]);

  return <VisitorCardsWorkspace cards={cards} events={events} />;
}