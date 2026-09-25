"use server";

import { revalidatePath } from "next/cache";

import {
  markChatRoomReadSchema,
  removeChatMessageSchema,
  sendChatMessageSchema,
} from "@/features/communications/chat/schemas/chat-message-schema";
import {
  markChatRoomRead,
  removeChatMessage,
  sendChatMessage,
} from "@/features/communications/chat/services/chat-message-service";

export type ChatMessageActionState = {
  success: boolean;
  message?: string;
};

const failure = (
  message: string,
): ChatMessageActionState => ({
  success: false,
  message,
});

export async function sendChatMessageAction(
  _state: ChatMessageActionState,
  formData: FormData,
): Promise<ChatMessageActionState> {
  const parsed = sendChatMessageSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return failure("Review the message.");
  }

  const messageId = await sendChatMessage(
    parsed.data.roomId,
    parsed.data.messageBody,
    parsed.data.replyToMessageId,
  );

  if (!messageId) {
    return failure("The message could not be sent.");
  }

  revalidatePath(
    `/communications/chat/${parsed.data.roomId}`,
  );
  revalidatePath("/communications/chat");

  return {
    success: true,
    message: "Message sent.",
  };
}

export async function removeChatMessageAction(
  _state: ChatMessageActionState,
  formData: FormData,
): Promise<ChatMessageActionState> {
  const parsed = removeChatMessageSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return failure("Review the moderation details.");
  }

  const success = await removeChatMessage(
    parsed.data.messageId,
    parsed.data.reason,
  );

  if (!success) {
    return failure("The message could not be removed.");
  }

  return {
    success: true,
    message: "Message removed.",
  };
}

export async function markChatRoomReadAction(
  _state: ChatMessageActionState,
  formData: FormData,
): Promise<ChatMessageActionState> {
  const parsed = markChatRoomReadSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return failure("The room could not be marked read.");
  }

  const success = await markChatRoomRead(
    parsed.data.roomId,
    parsed.data.messageId,
  );

  if (!success) {
    return failure("The room could not be marked read.");
  }

  revalidatePath("/communications/chat");
  revalidatePath(
    `/communications/chat/${parsed.data.roomId}`,
  );

  return {
    success: true,
  };
}