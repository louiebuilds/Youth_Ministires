import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CreateChatRoomForm } from "@/features/communications/chat/components/chat-room-management";
import { ChatUnreadBadge } from "@/features/communications/chat/components/chat-unread-badge";
import { listChatRooms } from "@/features/communications/chat/services/chat-room-service";

export const metadata: Metadata = {
  title: "Group Chat",
};

const managerRoles = new Set(["platform_administrator", "youth_pastor"]);

const roomTypeLabel = (value: string) => value.replaceAll("_", " ");

export default async function ChatRoomsPage() {
  const account = await requireCapability("communications.view");
  const result = await listChatRooms();
  const rooms = result.success ? result.data : [];
  const canManage = managerRoles.has(account.role);

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold text-sky-700">
          Communication Center
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Group chat
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Private room conversations for authorized ministry participants are
          separate from official announcements.
        </p>

        <nav
          className="mt-4 flex flex-wrap gap-3"
          aria-label="Communications workspaces"
        >
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700"
            href="/communications"
          >
            Announcements
          </Link>

          <span className="inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 font-semibold text-white">
            Group chat
          </span>
        </nav>
      </header>

      {canManage ? <CreateChatRoomForm /> : null}

      {!result.success ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"
          role="alert"
        >
          We couldn&apos;t load chat rooms. Please try again.
        </p>
      ) : null}

      {result.success && rooms.length > 0 ? (
        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Chat rooms"
        >
          {rooms.map((room) => (
            <Link
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              href={`/communications/chat/${room.roomId}`}
              key={room.roomId}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-950">
                  {room.roomName}
                </h2>

                <div className="flex shrink-0 items-center gap-2">
                  <ChatUnreadBadge
                    archived={Boolean(room.archivedAt)}
                    count={room.unreadCount}
                  />
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      room.archivedAt
                        ? "bg-slate-200 text-slate-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {room.archivedAt ? "Archived" : "Active"}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm capitalize text-slate-600">
                {roomTypeLabel(room.roomType)} room
              </p>

              <p className="mt-4 text-sm font-semibold text-sky-800">
                Open room
              </p>
            </Link>
          ))}
        </section>
      ) : null}

      {result.success && rooms.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No chat rooms are currently available to this account.
        </p>
      ) : null}
    </div>
  );
}
