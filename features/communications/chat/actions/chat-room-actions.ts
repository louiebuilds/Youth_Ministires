"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addChatMemberSchema,
  chatRoomIdSchema,
  createChatRoomSchema,
  removeChatMemberSchema,
  renameChatRoomSchema,
} from "@/features/communications/chat/schemas/chat-room-schema";
import {
  addChatRoomMember,
  archiveChatRoom,
  createChatRoom,
  removeChatRoomMember,
  renameChatRoom,
} from "@/features/communications/chat/services/chat-room-service";

export type ChatRoomActionState = {
  success: boolean;
  message?: string;
};

const failure = (message: string): ChatRoomActionState => ({
  success: false,
  message,
});

export async function createChatRoomAction(
  _state: ChatRoomActionState,
  formData: FormData,
): Promise<ChatRoomActionState> {
  const parsed = createChatRoomSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return failure("Review the room details.");
  }

  const roomId = await createChatRoom(
    parsed.data.name,
    parsed.data.roomType,
  );

  if (!roomId) {
    return failure("The room could not be created.");
  }

  revalidatePath("/communications/chat");
  redirect(`/communications/chat/${roomId}`);
}

export async function renameChatRoomAction(
  _state: ChatRoomActionState,
  formData: FormData,
): Promise<ChatRoomActionState> {
  const parsed = renameChatRoomSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return failure("Review the room details.");
  }

  const success = await renameChatRoom(
    parsed.data.roomId,
    parsed.data.name,
  );

  if (!success) {
    return failure("The room could not be renamed.");
  }

  revalidatePath("/communications/chat");
  revalidatePath(`/communications/chat/${parsed.data.roomId}`);

  return {
    success: true,
    message: "Room renamed.",
  };
}

export async function archiveChatRoomAction(
  _state: ChatRoomActionState,
  formData: FormData,
): Promise<ChatRoomActionState> {
  const parsed = chatRoomIdSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return failure("The room could not be archived.");
  }

  const success = await archiveChatRoom(parsed.data.roomId);

  if (!success) {
    return failure("The room could not be archived.");
  }

  revalidatePath("/communications/chat");
  revalidatePath(`/communications/chat/${parsed.data.roomId}`);

  redirect(`/communications/chat/${parsed.data.roomId}`);
}

export async function addChatRoomMemberAction(
  _state: ChatRoomActionState,
  formData: FormData,
): Promise<ChatRoomActionState> {
  const parsed = addChatMemberSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return failure("Review the member details.");
  }

  const success = await addChatRoomMember(
    parsed.data.roomId,
    parsed.data.profileId,
  );

  if (!success) {
    return failure("The member could not be added.");
  }

  revalidatePath(`/communications/chat/${parsed.data.roomId}`);

  return {
    success: true,
    message: "Member added.",
  };
}

export async function removeChatRoomMemberAction(
  _state: ChatRoomActionState,
  formData: FormData,
): Promise<ChatRoomActionState> {
  const parsed = removeChatMemberSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return failure("Review the member removal details.");
  }

  const success = await removeChatRoomMember(
    parsed.data.roomId,
    parsed.data.profileId,
    parsed.data.reason,
  );

  if (!success) {
    return failure("The member could not be removed.");
  }

  revalidatePath(`/communications/chat/${parsed.data.roomId}`);

  return {
    success: true,
    message: "Member removed.",
  };
}