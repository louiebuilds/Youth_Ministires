export type VisitorCardStatus =
  | "new"
  | "under_review"
  | "possible_duplicate"
  | "linked_existing"
  | "conversion_started"
  | "converted"
  | "closed"
  | "archived";

export type VisitorCardListItem = {
  visitorCardId: string;
  visitorName: string;
  visitDate: string;
  eventName: string | null;
  source: "staff" | "self_service";
  status: VisitorCardStatus;
  hasEmail: boolean;
  hasPhone: boolean;
  followUpEmail: boolean;
  followUpPhone: boolean;
  createdAt: string;
};

export type VisitorCardEventOption = {eventId:string;eventName:string;startsAt:string};
export type VisitorCardMatch = {personId:string;studentId:string|null;householdId:string|null;displayName:string;matchSignals:string[]};
export type VisitorCardReviewEvent = {reviewEventId:string;action:string;actorProfileId:string;reason:string|null;occurredAt:string};
export type VisitorCardLink = {linkId:string;linkType:string;personId:string|null;studentId:string|null;householdId:string|null;linkedByProfileId:string;linkReason:string;linkedAt:string};

export type VisitorCardDetail = {
  visitorCardId:string;source:"staff"|"self_service";eventId:string|null;eventName:string|null;visitDate:string;
  youthFirstName:string;youthLastName:string;guardianName:string|null;email:string|null;phone:string|null;
  gradeOrAgeGroup:string|null;invitedBy:string|null;howHeard:string|null;followUpEmail:boolean;followUpPhone:boolean;
  followUpNotes:string|null;status:VisitorCardStatus;submittedByProfileId:string|null;createdAt:string;archivedAt:string|null;
  reviewHistory:VisitorCardReviewEvent[];links:VisitorCardLink[];
};

export type VisitorCardActionState={success:boolean;message?:string};
