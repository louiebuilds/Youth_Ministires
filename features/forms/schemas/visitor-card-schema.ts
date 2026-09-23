import {z} from "zod";

const optionalText=(maximum:number)=>z.string().trim().max(maximum).transform(value=>value||null);
export const staffVisitorCardSchema=z.object({
  eventId:z.string().trim().transform(value=>value||null).pipe(z.string().uuid().nullable()),
  visitDate:z.iso.date(),
  youthFirstName:z.string().trim().min(1).max(100),
  youthLastName:z.string().trim().min(1).max(100),
  guardianName:optionalText(200),email:optionalText(320),phone:optionalText(40),
  gradeOrAgeGroup:optionalText(80),invitedBy:optionalText(200),howHeard:optionalText(300),
  followUpEmail:z.enum(["on"]).optional().transform(Boolean),followUpPhone:z.enum(["on"]).optional().transform(Boolean),
  followUpNotes:optionalText(2000),
}).refine(value=>Boolean(value.email||value.phone),{message:"Provide an email address or phone number."});

export const visitorReasonSchema=z.object({visitorCardId:z.string().uuid(),operation:z.string().min(1),reason:z.string().trim().max(1000).optional().default("")});
export const visitorLinkSchema=z.object({visitorCardId:z.string().uuid(),linkType:z.enum(["person","student","household"]),targetId:z.string().uuid(),reason:z.string().trim().min(5).max(1000)});
export const visitorConversionSchema=z.object({visitorCardId:z.string().uuid(),personId:z.string().trim().transform(v=>v||null).pipe(z.string().uuid().nullable()),studentId:z.string().trim().transform(v=>v||null).pipe(z.string().uuid().nullable()),householdId:z.string().trim().transform(v=>v||null).pipe(z.string().uuid().nullable()),reason:z.string().trim().min(5).max(1000)}).refine(v=>Boolean(v.personId||v.studentId||v.householdId),{message:"Provide at least one existing Member record ID."});
