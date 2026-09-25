import { z } from "zod";

export const chatRoomIdSchema = z.object({
  roomId: z.uuid(),
});

export const createChatRoomSchema = z.object({
  name: z.string().trim().min(1).max(150),
  roomType: z.enum([
    "ministry",
    "volunteer_team",
    "staff_leadership",
    "parent",
    "custom",
  ]),
});

export const renameChatRoomSchema = chatRoomIdSchema.extend({
  name: z.string().trim().min(1).max(150),
});

export const addChatMemberSchema = chatRoomIdSchema.extend({
  profileId: z.uuid(),
});

export const removeChatMemberSchema = addChatMemberSchema.extend({
  reason: z.string().trim().min(1).max(500),
});