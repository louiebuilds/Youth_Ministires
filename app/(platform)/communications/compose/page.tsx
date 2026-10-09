import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";

import {
  getCommunicationsEmailEnvironment,
  getCommunicationsSmsEnvironment,
} from "@/config/env";
import { getDefaultCommunicationChannel } from "@/features/administration/services/ministry-settings-service";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { hasCapability } from "@/features/auth/types/authorization";
import { CommunicationComposer } from "@/features/communications/components/communication-composer";
import {
  listCommunicationHistory,
  listCommunicationTemplates,
  previewCommunicationRecipients,
  previewLiveEmailRecipients,
  previewLiveSmsRecipients,
} from "@/features/communications/services/communication-service";

export const metadata: Metadata = { title: "Compose Communication" };

const channels = ["in_app", "email", "sms"] as const;
const audiences = ["parents", "volunteers"] as const;

export default async function ComposeCommunicationPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const account = await requireCapability("communications.manage");
  const params = await searchParams;
  const defaultChannel = await getDefaultCommunicationChannel();
  const channel = channels.includes(params.channel as typeof channels[number])
    ? params.channel as typeof channels[number] : defaultChannel;
  const audienceType = audiences.includes(
    params.audience as typeof audiences[number],
  ) ? params.audience as typeof audiences[number] : "parents";
  const search = typeof params.q === "string" && params.q.trim().length <= 100
    ? params.q.trim() || null : null;
  const emailEnvironment = getCommunicationsEmailEnvironment();
  const smsEnvironment = getCommunicationsSmsEnvironment();
  const canSendLiveEmail = hasCapability(account.role, "communications.send_live_email");
  const liveEmailAvailable = emailEnvironment.mode === "live"
    && canSendLiveEmail && emailEnvironment.liveEnabled;
  const liveEmailRequested = channel === "email"
    && emailEnvironment.mode === "live" && canSendLiveEmail;
  const liveEmailEnabled = channel === "email" && liveEmailAvailable;
  const canSendLiveSms = hasCapability(account.role, "communications.send_live_sms");
  const liveSmsAvailable = smsEnvironment.mode === "live"
    && canSendLiveSms && smsEnvironment.liveEnabled;
  const liveSmsRequested = channel === "sms"
    && smsEnvironment.mode === "live" && canSendLiveSms;
  const liveSmsEnabled = channel === "sms" && liveSmsAvailable;
  const [recipients, templates, history] = await Promise.all([
    liveEmailEnabled
      ? previewLiveEmailRecipients({
          audienceType,
          allowlist: emailEnvironment.allowlist,
        })
      : liveSmsEnabled
        ? previewLiveSmsRecipients({
            audienceType,
            allowlist: smsEnvironment.allowlist,
          })
      : previewCommunicationRecipients({ audienceType, channel }),
    listCommunicationTemplates(null, false),
    listCommunicationHistory(search),
  ]);
  const eligible = recipients.filter((item) => item.preferenceAuthorized);
  const liveSendCount = liveEmailEnabled || liveSmsEnabled
    ? recipients.filter((item) => "liveSendAllowed" in item && item.liveSendAllowed).length
    : 0;
  const availableCount = liveEmailEnabled || liveSmsEnabled
    ? liveSendCount
    : eligible.length;
  const unavailableCount = recipients.length - availableCount;
  const emailMode = liveEmailRequested
    ? emailEnvironment.liveEnabled ? "live" : "disabled"
    : "synthetic";
  const smsMode = liveSmsRequested
    ? smsEnvironment.liveEnabled ? "live" : "disabled"
    : "synthetic";
  return (
    <div className="space-y-8">
      <header>
        <Link className="text-sm font-semibold text-sky-700"
          href="/communications">← Back to Communication Center</Link>
        <h1 className="mt-2 text-3xl font-bold">Compose communication</h1>
        <p className="mt-2 text-slate-600">
          Create a message for parents, volunteers, or your ministry community.
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">Message settings</h2>
        <form className="grid gap-4 md:grid-cols-3" method="get">
          <label className="mt-4 text-sm font-semibold md:mt-3">Audience
            <select className={field} defaultValue={audienceType} name="audience">
              <option value="parents">Parents</option>
              <option value="volunteers">Volunteers</option>
            </select>
          </label>
          <label className="text-sm font-semibold md:mt-3">Channel
            <select className={field} defaultValue={channel} name="channel">
              <option value="in_app">In-app message</option>
              <option value="email">
                {liveEmailAvailable ? "Email" : "Email — Setup pending"}
              </option>
              <option value="sms">
                {liveSmsAvailable ? "SMS" : "SMS — Setup pending"}
              </option>
            </select>
          </label>
          <button className="min-h-11 self-end rounded-lg bg-slate-900 px-5 font-semibold text-white">
            Preview recipients
          </button>
        </form>
      </section>
      {channel === "email" && !liveEmailEnabled ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <h2 className="font-bold">Email setup pending</h2>
          <p className="mt-1">
            Email delivery will be available after the church sending domain is verified.
          </p>
        </section>
      ) : null}
      {channel === "sms" && !liveSmsEnabled ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <h2 className="font-bold">SMS setup pending</h2>
          <p className="mt-1">
            Text message delivery is not yet configured for this ministry.
          </p>
        </section>
      ) : null}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">Recipients</h2>
          <p className="mt-1 text-sm text-slate-600">
            {recipients.length} {audienceType} found
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {(channel === "sms" && !liveSmsEnabled) ||
              (channel === "email" && !liveEmailEnabled)
              ? `${eligible.length} ready when setup is complete · ${unavailableCount} unavailable`
              : `${availableCount} available · ${unavailableCount} unavailable`}
          </p>
          <ul className="mt-4 space-y-2">
            {recipients.map((recipient) => (
              <li className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                key={recipient.recipientProfileId}>
                <span>
                  <span className="block font-semibold">{recipient.displayName}</span>
                  {recipient.destinationMasked ? (
                    <span className="block break-all text-sm text-slate-600">
                      {recipient.destinationMasked}
                    </span>
                  ) : null}
                </span>
                <span className={recipientStatusClass(
                  recipientStatusLabel(
                    recipient,
                    channel,
                    liveEmailEnabled,
                    liveSmsEnabled,
                  ),
                )}>
                  {recipientStatusLabel(
                    recipient,
                    channel,
                    liveEmailEnabled,
                    liveSmsEnabled,
                  )}
                </span>
              </li>
            ))}
          </ul>
          {!recipients.length ? <p className="mt-4">No recipients found.</p> : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">Message</h2>
          <CommunicationComposer audienceType={audienceType} channel={channel}
            templates={templates} emailMode={emailMode}
            smsMode={smsMode}
            totalRecipientCount={recipients.length}
            liveSendCount={liveSendCount}
            suppressedCount={recipients.length - liveSendCount}
            idempotencyKey={randomUUID()} />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Communication history</h2>
        {history.map((item) => (
          <article className="rounded-xl border border-slate-200 bg-white p-5"
            key={item.communicationId}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {audienceLabel(item.audienceType)} · {channelLabel(item.channel)}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {statusLabel(item.communicationStatus)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {item.syntheticDelivery
                ? recipientCountLabel(item.deliveredCount)
                : `${item.sentCount + item.failedCount} attempted · ${item.failedCount} failed · ${item.suppressedCount} not included`}
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

type RecipientPreview = Awaited<ReturnType<typeof previewCommunicationRecipients>>[number]
  | Awaited<ReturnType<typeof previewLiveEmailRecipients>>[number]
  | Awaited<ReturnType<typeof previewLiveSmsRecipients>>[number];

function recipientStatusLabel(
  recipient: RecipientPreview,
  channel: typeof channels[number],
  liveEmailEnabled: boolean,
  liveSmsEnabled: boolean,
) {
  if (!recipient.preferenceAuthorized) {
    const reason = recipient.suppressionReason?.toLowerCase() ?? "";
    if (reason.includes("preference") || reason.includes("opt")) {
      return "Preference disabled";
    }
    if (channel === "email") return "Email unavailable";
    if (channel === "sms") return "Text unavailable";
    return "Unavailable";
  }
  if ("liveSendAllowed" in recipient && (liveEmailEnabled || liveSmsEnabled)) {
    return recipient.liveSendAllowed ? "Available" : "Not included";
  }
  if (channel === "email" || channel === "sms") return "Setup pending";
  return "Available";
}

function recipientStatusClass(status: string) {
  return status === "Available"
    ? "w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
    : "w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700";
}

function channelLabel(channel: string) {
  if (channel === "in_app") return "In-app message";
  if (channel === "email") return "Email";
  if (channel === "sms") return "SMS";
  return channel;
}

function statusLabel(status: string) {
  if (status === "delivered") return "Sent";
  return `${status.charAt(0).toUpperCase()}${status.slice(1).replaceAll("_", " ")}`;
}

function audienceLabel(audience: string) {
  if (audience === "ministry") return "Ministry community";
  return `${audience.charAt(0).toUpperCase()}${audience.slice(1).replaceAll("_", " ")}`;
}

function recipientCountLabel(count: number) {
  return `${count} recipient${count === 1 ? "" : "s"}`;
}
