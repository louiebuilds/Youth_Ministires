import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CommunicationComposer } from "@/features/communications/components/communication-composer";
import {
  listCommunicationHistory,
  listCommunicationTemplates,
  previewCommunicationRecipients,
} from "@/features/communications/services/communication-service";

export const metadata: Metadata = { title: "Compose Communication" };

const channels = ["in_app", "email", "sms"] as const;
const audiences = ["parents", "volunteers"] as const;

export default async function ComposeCommunicationPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  await requireCapability("communications.manage");
  const params = await searchParams;
  const channel = channels.includes(params.channel as typeof channels[number])
    ? params.channel as typeof channels[number] : "in_app";
  const audienceType = audiences.includes(
    params.audience as typeof audiences[number],
  ) ? params.audience as typeof audiences[number] : "parents";
  const search = typeof params.q === "string" && params.q.trim().length <= 100
    ? params.q.trim() || null : null;
  const [recipients, templates, history] = await Promise.all([
    previewCommunicationRecipients({ audienceType, channel }),
    listCommunicationTemplates(null, false),
    listCommunicationHistory(search),
  ]);
  const eligible = recipients.filter((item) => item.preferenceAuthorized);
  return (
    <div className="space-y-8">
      <header>
        <Link className="text-sm font-semibold text-sky-700"
          href="/communications">← Communication Center</Link>
        <h1 className="mt-2 text-3xl font-bold">Compose test communication</h1>
        <p className="mt-2 text-slate-600">
          Preview recipients and record provider-safe synthetic delivery.
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <form className="grid gap-4 md:grid-cols-3" method="get">
          <label className="text-sm font-semibold">Audience
            <select className={field} defaultValue={audienceType} name="audience">
              <option value="parents">Parents</option>
              <option value="volunteers">Volunteers</option>
            </select>
          </label>
          <label className="text-sm font-semibold">Channel
            <select className={field} defaultValue={channel} name="channel">
              <option value="in_app">In-app</option>
              <option value="email">Email — synthetic</option>
              <option value="sms">SMS — synthetic</option>
            </select>
          </label>
          <button className="min-h-11 self-end rounded-lg bg-slate-900 px-5 font-semibold text-white">
            Preview recipients
          </button>
        </form>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">Recipient preview</h2>
          <p className="mt-1 text-sm text-slate-600">
            {eligible.length} eligible · {recipients.length - eligible.length} suppressed
          </p>
          <ul className="mt-4 space-y-2">
            {recipients.map((recipient) => (
              <li className="rounded-lg border border-slate-200 p-3"
                key={recipient.recipientProfileId}>
                <span className="font-semibold">{recipient.displayName}</span>
                <span className="ml-2 text-sm text-slate-600">
                  {recipient.preferenceAuthorized
                    ? recipient.destinationMasked
                    : recipient.suppressionReason}
                </span>
              </li>
            ))}
          </ul>
          {!recipients.length ? <p className="mt-4">No recipients found.</p> : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">Message</h2>
          <CommunicationComposer audienceType={audienceType} channel={channel}
            templates={templates} />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Communication history</h2>
        {history.map((item) => (
          <article className="rounded-xl border border-slate-200 bg-white p-5"
            key={item.communicationId}>
            <div className="flex flex-wrap justify-between gap-3">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <span className="font-semibold">{item.channel} · {item.communicationStatus}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {item.audienceType} · {item.deliveredCount} delivered ·{" "}
              {item.suppressedCount} suppressed · synthetic
            </p>
          </article>
        ))}
        {!history.length ? <p>No communication history yet.</p> : null}
      </section>
    </div>
  );
}

const field =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
