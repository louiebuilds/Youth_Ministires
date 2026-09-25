import type {
  AccountRole,
  ChatRoomType,
  ChatSourceAccess,
} from "@/lib/supabase/database.types";

export type ChatRoomSummary = {
  archivedAt: string | null;
  canManage: boolean;
  eventId: string | null;
  lastMessageAt: string | null;
  roomId: string;
  roomName: string;
  roomType: ChatRoomType;
  scheduleId: string | null;
  sourceAccess: ChatSourceAccess;
  unreadCount: number;
};

export type ChatRoom = Omit<
  ChatRoomSummary,
  "lastMessageAt" | "unreadCount"
>;

export type ChatMemberCandidate = {
  displayName: string;
  isMember: boolean;
  primaryRole: AccountRole;
  profileId: string;
};

export type ChatQueryResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
    };