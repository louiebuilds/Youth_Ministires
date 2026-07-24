import { z } from "zod";

const requiredValue = z
  .string()
  .trim()
  .min(1, "is required");

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_NAME: requiredValue,
  NEXT_PUBLIC_APP_URL: z.url("must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_URL: z.url("must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredValue,
});

function formatEnvironmentError(error: z.ZodError) {
  const issues = error.issues.map((issue) => {
    const variable = issue.path.join(".");

    return `${variable || "environment"}: ${issue.message}`;
  });

  return [
    "Invalid public environment configuration.",
    ...issues,
    "Copy .env.example to .env.local and provide the required values.",
  ].join("\n");
}

export function getPublicEnvironment() {
  const result = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    throw new Error(formatEnvironmentError(result.error));
  }

  return Object.freeze({
    appName: result.data.NEXT_PUBLIC_APP_NAME,
    appUrl: result.data.NEXT_PUBLIC_APP_URL,
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
