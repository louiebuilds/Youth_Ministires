import { z } from "zod";

export const chatMessageIdSchema = z.object({
  messageId: z.uuid(),
});

export const sendChatMessageSchema = z.object({
  roomId: z.uuid(),
  messageBody: z
    .string()
    .trim()
    .min(1)
    .max(4000),
  replyToMessageId: z.preprocess(
    (value) =>
      value === "" ||
      value === undefined ||
      value === null
        ? null
        : value,
    z.uuid().nullable(),
  ),
});

export const removeChatMessageSchema =
  chatMessageIdSchema.extend({
    reason: z
      .string()
      .trim()
      .min(1)
      .max(500),
  });

export const markChatRoomReadSchema = z.object({
  roomId: z.uuid(),
  messageId: z.uuid(),
});