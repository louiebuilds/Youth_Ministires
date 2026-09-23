import {z} from "zod";
export const submissionIdSchema=z.string().uuid();
export const prepareSubmissionSchema=z.object({studentId:z.string().uuid(),templateVersionId:z.string().uuid(),extension:z.enum(["pdf","jpg","png"]),supersedesSubmissionId:z.union([z.literal(""),z.string().uuid()]).default("")});
export const submissionWorkflowSchema=z.object({submissionId:z.string().uuid(),reason:z.string().trim().max(1000).default("")});
