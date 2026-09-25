import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { ChatMessageWorkspace } from "@/features/communications/chat/components/chat-message-workspace";
import { ChatRoomManagement } from "@/features/communications/chat/components/chat-room-management";
import { ChatUnreadBadge } from "@/features/communications/chat/components/chat-unread-badge";
import { listChatMessages } from "@/features/communications/chat/services/chat-message-service";
import {
  getChatRoom,
  listChatMemberCandidates,
  listChatRooms,
} from "@/features/communications/chat/services/chat-room-service";

export const metadata: Metadata = {
  title: "Chat Room",
};

const roomIdSchema = z.string().uuid();

const roomTypeLabel = (value: string) =>
  value.replaceAll("_", " ");

export default async function ChatRoomPage({
  params,
}: Readonly<{
  params: Promise<{
    roomId: string;
  }>;
}>) {
  const account = await requireCapability(
    "communications.view",
  );

  const { roomId } = await params;
  const parsed = roomIdSchema.safeParse(roomId);

  if (!parsed.success) {
    notFound();
  }

  const [roomResult, roomListResult] = await Promise.all([
    getChatRoom(parsed.data),
    listChatRooms(),
  ]);

  if (!roomResult.success) {
    notFound();
  }

  const room = roomResult.data;

  const [messagesResult, candidatesResult] =
    await Promise.all([
      listChatMessages(room.roomId),
      room.canManage
        ? listChatMemberCandidates(room.roomId)
        : Promise.resolve(null),
    ]);

  return (
    <div className="space-y-6">
      <header>
        <Link
          className="text-sm font-semibold text-sky-700"
          href="/communications/chat"
        >
          ← Back to group chat
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold capitalize text-sky-700">
              {roomTypeLabel(room.roomType)} room
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              {room.roomName}
            </h1>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
              room.archivedAt
                ? "bg-slate-200 text-slate-700"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {room.archivedAt
              ? "Archived · read-only"
              : "Active"}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(14rem,19rem)_minmax(0,1fr)]">
        <aside
          className="rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-4 lg:self-start"
          aria-label="Available chat rooms"
        >
          <h2 className="font-bold text-slate-950">
            Your rooms
          </h2>

          {roomListResult.success ? (
            <nav className="mt-3 space-y-1">
              {roomListResult.data.map((item) => {
                const isCurrent =
                  item.roomId === room.roomId;

                return (
                  <Link
                    aria-current={
                      isCurrent ? "page" : undefined
                    }
                    className={`block min-h-11 rounded-lg px-3 py-2 font-semibold ${
                      isCurrent
                        ? "bg-sky-100 text-sky-900"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                    href={`/communications/chat/${item.roomId}`}
                    key={item.roomId}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>
                        {item.roomName}
                        {item.archivedAt ? (
                          <span className="block text-xs font-normal">
                            Archived
                          </span>
                        ) : null}
                      </span>
                      <ChatUnreadBadge
                        archived={Boolean(item.archivedAt)}
                        count={item.unreadCount}
                      />
                    </span>
                  </Link>
                );
              })}
            </nav>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Room navigation is temporarily unavailable.
            </p>
          )}
        </aside>

        <main className="space-y-5">
          {messagesResult.success ? (
            <ChatMessageWorkspace
              roomId={room.roomId}
              archived={Boolean(room.archivedAt)}
              messages={messagesResult.data}
              currentProfileId={account.id}
            />
          ) : (
            <p
              className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"
              role="alert"
            >
              We couldn&apos;t load the conversation.
              Please try again.
            </p>
          )}

          {room.canManage &&
          candidatesResult?.success ? (
            <ChatRoomManagement
              room={room}
              candidates={candidatesResult.data}
            />
          ) : null}

          {room.canManage &&
          candidatesResult &&
          !candidatesResult.success ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"
              role="alert"
            >
              We couldn&apos;t load room membership.
              Please try again.
            </p>
          ) : null}

          {!room.canManage ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold">
                Room access
              </h2>

              <p className="mt-2 text-slate-600">
                You can participate in this room because
                you are an authorized member. Room
                management is limited to ministry chat
                managers.
              </p>

              {room.archivedAt ? (
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  This room is archived and is available
                  as read-only history.
                </p>
              ) : null}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
