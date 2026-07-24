import type { z } from "zod";

import { childWorkspaceSchema } from "@/features/members/schemas/child-workspace-schema";

export type ChildWorkspace = z.infer<typeof childWorkspaceSchema>;
export type ChildRelationship = ChildWorkspace["relationships"][number];
