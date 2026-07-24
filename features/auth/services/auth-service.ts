import { createClient } from "@/lib/supabase/server";
import { getPublicEnvironment } from "@/config/env";

import type { LoginInput } from "@/features/auth/schemas/login-schema";
import type { RegisterInput } from "@/features/auth/schemas/register-schema";

type SignInResult =
  | {
      success: true;
    }
  | {
      success: false;
      reason: "invalid-credentials" | "unavailable";
    };

type SignUpResult =
  | {
      success: true;
    }
  | {
      success: false;
      reason: "rejected" | "unavailable";
    };

type PasswordResetRequestResult =
  | {
      success: true;
    }
  | {
      success: false;
      reason: "unavailable";
    };

type UpdatePasswordResult =
  | {
      success: true;
    }
  | {
      success: false;
      reason: "invalid-session" | "rejected" | "unavailable";
    };

export async function signInWithPassword(
  input: LoginInput,
): Promise<SignInResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(input);

    if (error) {
      return {
        success: false,
        reason:
          error.status && error.status >= 500
            ? "unavailable"
            : "invalid-credentials",
      };
    }

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function signUpWithPassword(
  input: RegisterInput,
): Promise<SignUpResult> {
  try {
    const supabase = await createClient();
    const environment = getPublicEnvironment();
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${environment.appUrl}/auth/callback?next=/login`,
      },
    });

    if (error) {
      return {
        success: false,
        reason:
          error.status === 429 || (error.status && error.status >= 500)
            ? "unavailable"
            : "rejected",
      };
    }

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetRequestResult> {
  try {
    const supabase = await createClient();
    const environment = getPublicEnvironment();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${environment.appUrl}/auth/callback?next=/reset-password`,
    });

    if (error?.status === 429 || (error?.status && error.status >= 500)) {
      return {
        success: false,
        reason: "unavailable",
      };
    }

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}

export async function updatePassword(
  password: string,
): Promise<UpdatePasswordResult> {
  try {
    const supabase = await createClient();
    const { data, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !data?.claims?.sub) {
      return {
        success: false,
        reason: "invalid-session",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return {
        success: false,
        reason: "rejected",
      };
    }

    await supabase.auth.signOut();

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      reason: "unavailable",
    };
  }
}
