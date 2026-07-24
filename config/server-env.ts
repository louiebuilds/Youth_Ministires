import "server-only";

import { z } from "zod";

import { getPublicEnvironment } from "@/config/env";

const serverEnvironmentSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .trim()
    .min(1, "is required"),
});

export function getServerEnvironment() {
  const publicEnvironment = getPublicEnvironment();
  const result = serverEnvironmentSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const variable = issue.path.join(".");

      return `${variable || "environment"}: ${issue.message}`;
    });

    throw new Error(
      [
        "Invalid server environment configuration.",
        ...issues,
        "Copy .env.example to .env.local and provide the required values.",
      ].join("\n"),
    );
  }

  return Object.freeze({
    ...publicEnvironment,
    supabaseServiceRoleKey: result.data.SUPABASE_SERVICE_ROLE_KEY,
  });
}
