"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  removeChatMessageAction,
  sendChatMessageAction,
  type ChatMessageActionState,
} from "@/features/communications/chat/actions/chat-message-actions";
import { ChatRealtimeRefresh } from "@/features/communications/chat/components/chat-realtime-refresh";
import type { ChatMessage } from "@/features/communications/chat/types/chat-message";

const initialState: ChatMessageActionState = {
  success: false,
};

type ChatMessageWorkspaceProps = Readonly<{
  roomId: string;
  archived: boolean;
  messages: ChatMessage[];
  currentProfileId: string;
}>;

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function dayKey(value: string) {
  return new Date(value).toDateString();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ChatMessageWorkspace({
  roomId,
  archived,
  messages,
  currentProfileId,
}: ChatMessageWorkspaceProps) {
  const [replyTarget, setReplyTarget] =
    useState<ChatMessage | null>(null);

  const [sendState, sendAction, sendPending] =
    useActionState(
      sendChatMessageAction,
      initialState,
    );

  const groupedMessages = useMemo(() => {
    const groups: {
      day: string;
      messages: ChatMessage[];
    }[] = [];

    for (const message of messages) {
      const key = dayKey(message.createdAt);
      const currentGroup = groups.at(-1);

      if (!currentGroup || currentGroup.day !== key) {
        groups.push({
          day: key,
          messages: [message],
        });

        continue;
      }

      currentGroup.messages.push(message);
    }

    return groups;
  }, [messages]);

  const latestVisibleMessageId = useMemo(
    () => messages.findLast((message) => !message.removedAt)?.messageId ?? null,
    [messages],
  );

  return (
    <section className="flex min-h-[38rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Conversation
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Messages are visible only to room members.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <ChatRealtimeRefresh
              archived={archived}
              latestVisibleMessageId={latestVisibleMessageId}
              roomId={roomId}
            />
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                archived
                  ? "bg-slate-100 text-slate-700"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {archived ? "Read-only" : "Active"}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
        {!messages.length ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-sky-100 text-2xl">
                💬
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Start the conversation
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Send the first message to everyone in this room.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-7">
            {groupedMessages.map((group) => (
              <div key={group.day}>
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />

                  <span className="text-xs font-semibold text-slate-500">
                    {formatDay(
                      group.messages[0].createdAt,
                    )}
                  </span>

                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="space-y-4">
                  {group.messages.map((message) => (
                    <MessageBubble
                      key={message.messageId}
                      message={message}
                      archived={archived}
                      isOwn={
                        message.authorProfileId ===
                        currentProfileId
                      }
                      onReply={() =>
                        setReplyTarget(message)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {archived ? (
        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <p className="text-center text-sm font-semibold text-slate-600">
            This room is archived and read-only.
          </p>
        </div>
      ) : (
        <form
          action={sendAction}
          className="border-t border-slate-200 bg-white p-4"
          onSubmit={() => setReplyTarget(null)}
        >
          <input
            type="hidden"
            name="roomId"
            value={roomId}
          />

          <input
            type="hidden"
            name="replyToMessageId"
            value={replyTarget?.messageId ?? ""}
          />

          {replyTarget ? (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-xl bg-slate-100 px-4 py-3">
              <div className="min-w-0 border-l-4 border-sky-500 pl-3">
                <p className="text-xs font-bold text-sky-700">
                  Replying to {replyTarget.authorName}
                </p>

                <p className="mt-1 truncate text-sm text-slate-600">
                  {replyTarget.messageBody ??
                    "Message removed"}
                </p>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                onClick={() =>
                  setReplyTarget(null)
                }
              >
                ✕
              </button>
            </div>
          ) : null}

          <div className="flex items-end gap-3">
            <label
              className="sr-only"
              htmlFor="chat-message-body"
            >
              Message
            </label>

            <textarea
              id="chat-message-body"
              className="min-h-12 max-h-32 flex-1 resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
              maxLength={4000}
              name="messageBody"
              placeholder={
                replyTarget
                  ? `Reply to ${replyTarget.authorName}…`
                  : "Message the group…"
              }
              required
              rows={1}
              disabled={sendPending}
            />

            <button
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sky-700 text-lg font-bold text-white shadow-sm transition hover:bg-sky-800 disabled:opacity-60"
              disabled={sendPending}
              aria-label="Send message"
              title="Send message"
            >
              {sendPending ? "…" : "➤"}
            </button>
          </div>

          {sendState.message ? (
            <div className="mt-2">
              <MessageResult state={sendState} />
            </div>
          ) : null}
        </form>
      )}
    </section>
  );
}

function MessageBubble({
  message,
  archived,
  isOwn,
  onReply,
}: Readonly<{
  message: ChatMessage;
  archived: boolean;
  isOwn: boolean;
  onReply: () => void;
}>) {
  const [removeState, removeAction, removePending] =
    useActionState(
      removeChatMessageAction,
      initialState,
    );

  const [moderationOpen, setModerationOpen] =
    useState(false);

  const removed = Boolean(message.removedAt);

  return (
    <article
      className={`flex items-end gap-2 ${
        isOwn
          ? "justify-end"
          : "justify-start"
      }`}
    >
      {!isOwn ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-700">
          {initials(message.authorName)}
        </div>
      ) : null}

      <div
        className={`max-w-[78%] ${
          isOwn ? "items-end" : "items-start"
        } flex flex-col`}
      >
        {!isOwn ? (
          <p className="mb-1 px-1 text-xs font-bold text-slate-600">
            {message.authorName}
          </p>
        ) : null}

        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            removed
              ? "border border-slate-200 bg-slate-100 text-slate-500"
              : isOwn
                ? "rounded-br-md bg-sky-700 text-white"
                : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
          }`}
        >
          {message.replyToMessageId ? (
            <div
              className={`mb-2 rounded-lg border-l-4 px-3 py-2 text-sm ${
                isOwn && !removed
                  ? "border-sky-200 bg-sky-800/40 text-sky-50"
                  : "border-sky-300 bg-slate-50 text-slate-600"
              }`}
            >
              <p className="text-xs font-bold">
                {message.replyAuthorName ??
                  "Participant"}
              </p>

              <p className="mt-0.5 line-clamp-2">
                {message.replyMessageBody ??
                  "Message removed"}
              </p>
            </div>
          ) : null}

          {removed ? (
            <p className="italic">
              This message was removed by a moderator.
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words">
              {message.messageBody}
            </p>
          )}
        </div>

        <div
          className={`mt-1 flex items-center gap-3 px-1 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <span className="text-[11px] text-slate-400">
            {formatTime(message.createdAt)}
          </span>

          {!isOwn &&
          !removed &&
          !archived ? (
            <button
              type="button"
              className="text-[11px] font-semibold text-slate-500 hover:text-sky-700"
              onClick={onReply}
            >
              Reply
            </button>
          ) : null}

          {message.canModerate &&
          !removed &&
          !archived ? (
            <details
              className="relative"
              open={moderationOpen}
              onToggle={(event) =>
                setModerationOpen(
                  event.currentTarget.open,
                )
              }
            >
              <summary className="cursor-pointer list-none text-base font-bold leading-none text-slate-400 hover:text-slate-700">
                ···
              </summary>

              <div
                className={`absolute z-10 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg ${
                  isOwn ? "right-0" : "left-0"
                }`}
              >
                <p className="text-sm font-bold text-slate-900">
                  Remove message
                </p>

                <form
                  action={removeAction}
                  className="mt-2"
                  onSubmit={() =>
                    setModerationOpen(false)
                  }
                >
                  <input
                    type="hidden"
                    name="messageId"
                    value={message.messageId}
                  />

                  <label className="block text-xs font-semibold text-slate-700">
                    Reason
                    <input
                      className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      name="reason"
                      maxLength={500}
                      required
                      disabled={removePending}
                    />
                  </label>

                  <button
                    className="mt-2 min-h-10 w-full rounded-lg bg-red-50 px-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    disabled={removePending}
                  >
                    {removePending
                      ? "Removing…"
                      : "Remove message"}
                  </button>

                  <div className="mt-2">
                    <MessageResult
                      state={removeState}
                    />
                  </div>
                </form>
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MessageResult({
  state,
}: Readonly<{
  state: ChatMessageActionState;
}>) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`text-sm ${
        state.success
          ? "text-emerald-700"
          : "text-red-700"
      }`}
      role={
        state.success ? "status" : "alert"
      }
    >
      {state.message}
    </p>
  );
}
