import { createClient } from "@/lib/supabase/server";

export type AuthenticatedAccount = Readonly<{
  email: string;
  id: string;
}>;

export async function getAuthenticatedAccount(): Promise<AuthenticatedAccount | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const id = data?.claims?.sub;
    const email = data?.claims?.email;

    if (error || typeof id !== "string" || typeof email !== "string") {
      return null;
    }

    return {
      email,
      id,
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserId() {
  const account = await getAuthenticatedAccount();

  return account?.id ?? null;
}
