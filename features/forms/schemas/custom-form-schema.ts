import {z} from "zod";
export const customTemplateSchema=z.object({name:z.string().trim().min(1).max(200),description:z.string().trim().max(2000).transform(v=>v||null)});
export const customVersionSchema=z.object({templateId:z.string().uuid(),title:z.string().trim().min(1).max(200),instructions:z.string().trim().max(5000).transform(v=>v||null)});
export const customFieldSchema=z.object({versionId:z.string().uuid(),fieldKey:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),fieldType:z.enum(["short_text","long_text","yes_no","single_choice","multiple_choice","date","acknowledgment"]),label:z.string().trim().min(1).max(300),helpText:z.string().trim().max(1000).transform(v=>v||null),isRequired:z.enum(["on"]).optional().transform(Boolean),displayOrder:z.coerce.number().int().min(0),choiceOptions:z.string().trim().transform(v=>v?v.split(",").map(x=>x.trim()).filter(Boolean):null)});
export const customAssignmentSchema=z.object({versionId:z.string().uuid(),assignmentType:z.enum(["event","student","household","volunteer","general_ministry"]),targetId:z.string().trim().transform(v=>v||null)}).superRefine((value,context)=>{
 if(value.assignmentType!=="general_ministry"&&!value.targetId)context.addIssue({code:"custom",path:["targetId"],message:"Select a target before creating the assignment."});
 if(value.assignmentType!=="general_ministry"&&value.targetId&&!z.string().uuid().safeParse(value.targetId).success)context.addIssue({code:"custom",path:["targetId"],message:"Select a valid assignment target."});
 if(value.assignmentType==="general_ministry"&&value.targetId)context.addIssue({code:"custom",path:["targetId"],message:"General Ministry assignments do not use a target."});
});
