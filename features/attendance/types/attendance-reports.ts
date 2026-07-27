export type AttendanceSessionReport = {
  sessionId: string;
  sessionDate: string;
  eventName: string;
  className: string;
  finalizedAt: string | null;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  pendingCount: number;
};

export type CheckInEventReport = {
  eventId: string;
  eventName: string;
  startsAt: string;
  checkedInCount: number;
  checkedOutCount: number;
  exceptionCount: number;
  visitorCount: number;
  visitorCheckedOutCount: number;
};
