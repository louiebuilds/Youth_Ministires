"use client";

import { useEffect, useState } from "react";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { createClient } from "@/lib/supabase/client";

type SessionState = "loading" | "ready" | "invalid";

const invitationFlowKey = "youth-ministries-account-invitation";

export function InvitationSessionGate() {
  const [sessionState, setSessionState] =
    useState<SessionState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function establishInvitationSession() {
      const supabase = createClient();

      const hashParameters = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash,
      );

      const accessToken = hashParameters.get("access_token");
      const refreshToken = hashParameters.get("refresh_token");
      const authError = hashParameters.get("error");
      const authErrorDescription =
        hashParameters.get("error_description");

      if (authError || authErrorDescription) {
        if (!cancelled) {
          setSessionState("invalid");
        }

        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          if (!cancelled) {
            setSessionState("invalid");
          }

          return;
        }

        window.sessionStorage.setItem(invitationFlowKey, "true");

        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );

        if (!cancelled) {
          setSessionState("ready");
        }

        return;
      }

      const invitationFlow =
        window.sessionStorage.getItem(invitationFlowKey) === "true";

      if (!invitationFlow) {
        if (!cancelled) {
          setSessionState("invalid");
        }

        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        if (!cancelled) {
          setSessionState("invalid");
        }

        return;
      }

      if (!cancelled) {
        setSessionState("ready");
      }
    }

    void establishInvitationSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (sessionState === "loading") {
    return (
      <div
        aria-live="polite"
        className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700"
        role="status"
      >
        Verifying your invitation…
      </div>
    );
  }

  if (sessionState === "invalid") {
    return (
      <div
        aria-live="polite"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-800"
        role="alert"
      >
        This invitation link is invalid or has expired. Contact a ministry
        administrator for a new invitation.
      </div>
    );
  }

  return <ResetPasswordForm mode="invitation" />;
}