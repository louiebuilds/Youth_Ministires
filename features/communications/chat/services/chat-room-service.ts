import "server-only";

import type {
  ChatMemberCandidate,
  ChatQueryResult,
  ChatRoom,
  ChatRoomSummary,
} from "@/features/communications/chat/types/chat";
import type { ChatRoomType } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type RpcClient = {
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): Promise<{
    data: unknown;
    error: {
      code?: string;
    } | null;
  }>;
};

async function rpc(
  name: string,
  args?: Record<string, unknown>,
) {
  const client = (await createClient()) as unknown as RpcClient;

  return client.rpc(name, args);
}

function logFailure(
  operation: string,
  code?: string,
) {
  console.error("Chat room operation failed", {
    operation,
    code: code ?? "unknown",
    category: code === "42501" ? "denied" : "rpc_failure",
  });
}

function mapRoom(
  row: Record<string, unknown>,
): ChatRoom {
  return {
    archivedAt: row.archived_at as string | null,
    canManage: Boolean(row.can_manage),
    eventId: row.event_id as string | null,
    roomId: String(row.room_id),
    roomName: String(row.room_name),
    roomType: row.room_type as ChatRoomType,
    scheduleId: row.schedule_id as string | null,
    sourceAccess: row.source_access as ChatRoom["sourceAccess"],
  };
}

export async function listChatRooms(): Promise<
  ChatQueryResult<ChatRoomSummary[]>
> {
  const { data, error } = await rpc("list_chat_rooms");

  if (error) {
    logFailure("list_chat_rooms", error.code);

    return {
      success: false,
    };
  }

  const rooms = (
    (data ?? []) as Record<string, unknown>[]
  ).map((row) => ({
    ...mapRoom(row),
    lastMessageAt: row.last_message_at as string | null,
    unreadCount: Number(row.unread_count),
  }));

  return {
    success: true,
    data: rooms,
  };
}

export async function getChatRoom(
  roomId: string,
): Promise<ChatQueryResult<ChatRoom>> {
  const { data, error } = await rpc(
    "get_chat_room",
    {
      p_room_id: roomId,
    },
  );

  if (error || !data) {
    logFailure("get_chat_room", error?.code);

    return {
      success: false,
    };
  }

  return {
    success: true,
    data: mapRoom(
      data as Record<string, unknown>,
    ),
  };
}

export async function listChatMemberCandidates(
  roomId: string,
): Promise<ChatQueryResult<ChatMemberCandidate[]>> {
  const { data, error } = await rpc(
    "list_chat_member_candidates",
    {
      p_room_id: roomId,
    },
  );

  if (error) {
    logFailure(
      "list_chat_member_candidates",
      error.code,
    );

    return {
      success: false,
    };
  }

  const candidates = (
    (data ?? []) as Record<string, unknown>[]
  ).map((row) => ({
    displayName: String(row.display_name),
    isMember: Boolean(row.is_member),
    primaryRole:
      row.primary_role as ChatMemberCandidate["primaryRole"],
    profileId: String(row.profile_id),
  }));

  return {
    success: true,
    data: candidates,
  };
}

export async function createChatRoom(
  name: string,
  roomType: ChatRoomType,
): Promise<string | null> {
  const result = await rpc(
    "create_chat_room",
    {
      p_name: name,
      p_room_type: roomType,
      p_source_access: "explicit",
      p_event_id: null,
      p_schedule_id: null,
    },
  );

  if (result.error) {
    logFailure(
      "create_chat_room",
      result.error.code,
    );

    return null;
  }

  if (!result.data) {
    return null;
  }

  return String(result.data);
}

async function mutate(
  operation: string,
  args: Record<string, unknown>,
): Promise<boolean> {
  const result = await rpc(
    operation,
    args,
  );

  if (result.error) {
    logFailure(
      operation,
      result.error.code,
    );

    return false;
  }

  return true;
}

export async function renameChatRoom(
  roomId: string,
  name: string,
): Promise<boolean> {
  return mutate(
    "rename_chat_room",
    {
      p_room_id: roomId,
      p_name: name,
    },
  );
}

export async function archiveChatRoom(
  roomId: string,
): Promise<boolean> {
  return mutate(
    "archive_chat_room",
    {
      p_room_id: roomId,
    },
  );
}

export async function addChatRoomMember(
  roomId: string,
  profileId: string,
): Promise<boolean> {
  return mutate(
    "add_chat_room_member",
    {
      p_room_id: roomId,
      p_profile_id: profileId,
    },
  );
}

export async function removeChatRoomMember(
  roomId: string,
  profileId: string,
  reason: string,
): Promise<boolean> {
  return mutate(
    "remove_chat_room_member",
    {
      p_room_id: roomId,
      p_profile_id: profileId,
      p_reason: reason,
    },
  );
}