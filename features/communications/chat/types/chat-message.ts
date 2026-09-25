export type ChatMessage = {
  authorName: string;
  authorProfileId: string;
  canModerate: boolean;
  createdAt: string;
  messageBody: string | null;
  messageId: string;
  removedAt: string | null;
  replyAuthorName: string | null;
  replyMessageBody: string | null;
  replyToMessageId: string | null;
};

export type ChatMessageQueryResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
    };