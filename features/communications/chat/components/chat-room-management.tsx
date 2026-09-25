"use client";

import { useActionState } from "react";

import {
  addChatRoomMemberAction,
  archiveChatRoomAction,
  createChatRoomAction,
  removeChatRoomMemberAction,
  renameChatRoomAction,
  type ChatRoomActionState,
} from "@/features/communications/chat/actions/chat-room-actions";
import type {
  ChatMemberCandidate,
  ChatRoom,
} from "@/features/communications/chat/types/chat";

const initialState: ChatRoomActionState = {
  success: false,
};

const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3";

function Result({
  state,
}: Readonly<{
  state: ChatRoomActionState;
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
      role={state.success ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

export function CreateChatRoomForm() {
  const [state, action, pending] = useActionState(
    createChatRoomAction,
    initialState,
  );

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-5">
      <summary className="min-h-11 cursor-pointer content-center text-lg font-bold">
        Create room
      </summary>

      <form
        action={action}
        className="mt-4 grid gap-4 md:grid-cols-2"
      >
        <label className="text-sm font-semibold">
          Room name
          <input
            className={inputClass}
            name="name"
            maxLength={150}
            required
          />
        </label>

        <label className="text-sm font-semibold">
          Room type
          <select
            className={inputClass}
            name="roomType"
            defaultValue="custom"
          >
            <option value="ministry">
              Ministry
            </option>
            <option value="volunteer_team">
              Volunteer team
            </option>
            <option value="staff_leadership">
              Staff leadership
            </option>
            <option value="parent">
              Parent
            </option>
            <option value="custom">
              Custom
            </option>
          </select>
        </label>

        <p className="text-sm text-slate-600 md:col-span-2">
          Event-linked room creation is intentionally
          deferred. Members can be added after this room
          is created.
        </p>

        <Result state={state} />

        <button
          className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Creating…" : "Create room"}
        </button>
      </form>
    </details>
  );
}

export function ChatRoomManagement({
  room,
  candidates,
}: Readonly<{
  room: ChatRoom;
  candidates: ChatMemberCandidate[];
}>) {
  const [renameState, renameAction, renamePending] =
    useActionState(
      renameChatRoomAction,
      initialState,
    );

  const [addState, addAction, addPending] =
    useActionState(
      addChatRoomMemberAction,
      initialState,
    );

  const [removeState, removeAction, removePending] =
    useActionState(
      removeChatRoomMemberAction,
      initialState,
    );

  const [archiveState, archiveAction, archivePending] =
    useActionState(
      archiveChatRoomAction,
      initialState,
    );

  const members = candidates.filter(
    (candidate) => candidate.isMember,
  );

  const available = candidates.filter(
    (candidate) => !candidate.isMember,
  );

  if (room.archivedAt) {
    return (
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-bold text-slate-950">
              Room settings
            </p>

            <p className="mt-0.5 text-sm text-slate-500">
              Archived room · read-only
            </p>
          </div>

          <span className="text-sm font-semibold text-sky-700">
            View
          </span>
        </summary>

        <div className="border-t border-slate-200 p-5">
          <h2 className="text-lg font-bold">
            Archived room
          </h2>

          <p className="mt-2 text-slate-600">
            Room history is retained read-only. Renaming
            and membership changes are unavailable.
          </p>

          <MemberList members={members} />
        </div>
      </details>
    );
  }

  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-bold text-slate-950">
            Room settings
          </p>

          <p className="mt-0.5 text-sm text-slate-500">
            Rename room, manage members, or archive
          </p>
        </div>

        <span className="text-sm font-semibold text-sky-700">
          Manage
        </span>
      </summary>

      <div className="space-y-6 border-t border-slate-200 p-5">
        <section>
          <h2 className="text-base font-bold text-slate-950">
            Room details
          </h2>

          <form
            action={renameAction}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <input
              type="hidden"
              name="roomId"
              value={room.roomId}
            />

            <label className="min-w-64 flex-1 text-sm font-semibold">
              Room name
              <input
                className={inputClass}
                name="name"
                defaultValue={room.roomName}
                maxLength={150}
                required
              />
            </label>

            <button
              className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold disabled:opacity-60"
              disabled={renamePending}
            >
              {renamePending
                ? "Renaming…"
                : "Rename"}
            </button>
          </form>

          <div className="mt-2">
            <Result state={renameState} />
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <h2 className="text-base font-bold text-slate-950">
            Members
          </h2>

          <MemberList members={members} />

          <form
            action={addAction}
            className="mt-5 flex flex-wrap items-end gap-3"
          >
            <input
              type="hidden"
              name="roomId"
              value={room.roomId}
            />

            <label className="min-w-64 flex-1 text-sm font-semibold">
              Add eligible member
              <select
                className={inputClass}
                name="profileId"
                required
                defaultValue=""
                disabled={
                  !available.length || addPending
                }
              >
                <option value="" disabled>
                  {available.length
                    ? "Select a profile"
                    : "No eligible profiles"}
                </option>

                {available.map((candidate) => (
                  <option
                    key={candidate.profileId}
                    value={candidate.profileId}
                  >
                    {candidate.displayName} ·{" "}
                    {candidate.primaryRole.replaceAll(
                      "_",
                      " ",
                    )}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="min-h-11 rounded-lg border border-sky-700 px-4 font-semibold text-sky-800 disabled:opacity-60"
              disabled={
                !available.length || addPending
              }
            >
              {addPending
                ? "Adding…"
                : "Add member"}
            </button>
          </form>

          <div className="mt-2">
            <Result state={addState} />
          </div>

          <form
            action={removeAction}
            className="mt-5 grid gap-3 border-t border-slate-200 pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <input
              type="hidden"
              name="roomId"
              value={room.roomId}
            />

            <label className="text-sm font-semibold">
              Current member
              <select
                className={inputClass}
                name="profileId"
                required
                defaultValue=""
                disabled={
                  !members.length ||
                  removePending
                }
              >
                <option value="" disabled>
                  {members.length
                    ? "Select a member"
                    : "No current members"}
                </option>

                {members.map((member) => (
                  <option
                    key={member.profileId}
                    value={member.profileId}
                  >
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold">
              Removal reason
              <input
                className={inputClass}
                name="reason"
                maxLength={500}
                required
                disabled={removePending}
              />
            </label>

            <button
              className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-800 disabled:opacity-60"
              disabled={
                !members.length ||
                removePending
              }
            >
              {removePending
                ? "Removing…"
                : "Remove member"}
            </button>
          </form>

          <div className="mt-2">
            <Result state={removeState} />
          </div>
        </section>

        <section className="border-t border-red-200 pt-5">
          <h2 className="text-base font-bold text-red-950">
            Archive room
          </h2>

          <p className="mt-2 text-sm text-red-900">
            Archiving preserves authorized history and
            makes the room read-only.
          </p>

          <form
            action={archiveAction}
            className="mt-3"
          >
            <input
              type="hidden"
              name="roomId"
              value={room.roomId}
            />

            <button
              className="min-h-11 rounded-lg border border-red-400 bg-white px-4 font-semibold text-red-900 disabled:opacity-60"
              disabled={archivePending}
            >
              {archivePending
                ? "Archiving…"
                : "Archive room"}
            </button>
          </form>

          <div className="mt-2">
            <Result state={archiveState} />
          </div>
        </section>
      </div>
    </details>
  );
}

function MemberList({
  members,
}: Readonly<{
  members: ChatMemberCandidate[];
}>) {
  if (!members.length) {
    return (
      <p className="mt-3 text-sm text-slate-600">
        No explicit members are currently assigned.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
      {members.map((member) => (
        <li
          className="flex flex-wrap justify-between gap-2 px-3 py-2"
          key={member.profileId}
        >
          <span className="font-semibold">
            {member.displayName}
          </span>

          <span className="text-sm capitalize text-slate-600">
            {member.primaryRole.replaceAll("_", " ")}
          </span>
        </li>
      ))}
    </ul>
  );
}