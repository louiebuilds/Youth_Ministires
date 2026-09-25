import "server-only";

import type {
  ChatMessage,
  ChatMessageQueryResult,
} from "@/features/communications/chat/types/chat-message";
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
  console.error("Chat message operation failed", {
    operation,
    code: code ?? "unknown",
    category: code === "42501" ? "denied" : "rpc_failure",
  });
}

function mapMessage(
  row: Record<string, unknown>,
): ChatMessage {
  return {
    authorName: String(row.author_name),
    authorProfileId: String(row.author_profile_id),
    canModerate: Boolean(row.can_moderate),
    createdAt: String(row.created_at),
    messageBody:
      row.message_body === null
        ? null
        : String(row.message_body),
    messageId: String(row.message_id),
    removedAt:
      row.removed_at === null
        ? null
        : String(row.removed_at),
    replyAuthorName:
      row.reply_author_name === null
        ? null
        : String(row.reply_author_name),
    replyMessageBody:
      row.reply_message_body === null
        ? null
        : String(row.reply_message_body),
    replyToMessageId:
      row.reply_to_message_id === null
        ? null
        : String(row.reply_to_message_id),
  };
}

export async function listChatMessages(
  roomId: string,
  before?: string | null,
  limit = 100,
): Promise<ChatMessageQueryResult<ChatMessage[]>> {
  const { data, error } = await rpc(
    "list_chat_messages",
    {
      p_room_id: roomId,
      p_before: before ?? null,
      p_limit: limit,
    },
  );

  if (error) {
    logFailure(
      "list_chat_messages",
      error.code,
    );

    return {
      success: false,
    };
  }

  return {
    success: true,
    data: (
      (data ?? []) as Record<string, unknown>[]
    ).map(mapMessage),
  };
}

export async function sendChatMessage(
  roomId: string,
  messageBody: string,
  replyToMessageId?: string | null,
): Promise<string | null> {
  const { data, error } = await rpc(
    "send_chat_message",
    {
      p_room_id: roomId,
      p_message_body: messageBody,
      p_reply_to_message_id:
        replyToMessageId ?? null,
    },
  );

  if (error) {
    logFailure(
      "send_chat_message",
      error.code,
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return String(data);
}

export async function removeChatMessage(
  messageId: string,
  reason: string,
): Promise<boolean> {
  const { error } = await rpc(
    "remove_chat_message",
    {
      p_message_id: messageId,
      p_reason: reason,
    },
  );

  if (error) {
    logFailure(
      "remove_chat_message",
      error.code,
    );

    return false;
  }

  return true;
}

export async function markChatRoomRead(
  roomId: string,
  messageId: string,
): Promise<boolean> {
  const { error } = await rpc(
    "mark_chat_room_read",
    {
      p_room_id: roomId,
      p_message_id: messageId,
    },
  );

  if (error) {
    logFailure(
      "mark_chat_room_read",
      error.code,
    );

    return false;
  }

  return true;
}