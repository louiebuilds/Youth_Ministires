"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { Html5Qrcode } from "html5-qrcode";

import { resolveFamilyTokenAction } from "@/features/check-in/actions/check-in-actions";

import type { CheckInActionState } from "@/features/check-in/types/check-in";

const initialState: CheckInActionState = {
  success: false,
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

function extractFamilyPassToken(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    const fragment = url.hash.startsWith("#")
      ? url.hash.slice(1)
      : url.hash;

    const fragmentParams =
      new URLSearchParams(fragment);

    const pass =
      fragmentParams.get("pass");

    if (pass) {
      return pass;
    }

    const queryPass =
      url.searchParams.get("token");

    if (queryPass) {
      return queryPass;
    }
  } catch {
    // The scanner may have been given the raw pass
    // instead of a URL. Fall through to raw-token
    // handling below.
  }

  return trimmed.length >= 70
    ? trimmed
    : null;
}

export function ResolveFamilyPassForm({
  eventId,
}: Readonly<{
  eventId: string;
}>) {
  const [state, action, pending] =
    useActionState(
      resolveFamilyTokenAction,
      initialState,
    );

  const [token, setToken] =
    useState("");

  const [scannerOpen, setScannerOpen] =
    useState(false);

  const [
    scannerMessage,
    setScannerMessage,
  ] = useState<string | null>(null);

  const formRef =
    useRef<HTMLFormElement>(null);

  const scannerRef =
    useRef<Html5Qrcode | null>(null);

  const handledScanRef =
    useRef(false);

  useEffect(() => {
    if (!scannerOpen) {
      return;
    }

    let cancelled = false;

    const scanner =
      new Html5Qrcode(
        "family-qr-reader",
      );

    scannerRef.current = scanner;
    handledScanRef.current = false;

    async function startScanner() {
      try {
        setScannerMessage(
          "Starting camera…",
        );

        await scanner.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (decodedText) => {
            if (
              handledScanRef.current ||
              cancelled
            ) {
              return;
            }

            const pass =
              extractFamilyPassToken(
                decodedText,
              );

            if (!pass) {
              setScannerMessage(
                "That QR does not appear to be a valid family pass.",
              );
              return;
            }

            handledScanRef.current = true;

            setScannerMessage(
              "Family pass recognized. Opening family…",
            );

            setToken(pass);

            try {
              await scanner.stop();
            } catch {
              // Scanner may already be stopping.
            }

            setScannerOpen(false);

            window.setTimeout(() => {
              formRef.current?.requestSubmit();
            }, 0);
          },
          () => {
            // Ignore individual decode failures while
            // the camera continues looking for a QR.
          },
        );

        if (!cancelled) {
          setScannerMessage(
            "Point the camera at the family QR code.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          const errorName =
            error instanceof DOMException
              ? error.name
              : "UnknownError";

          console.error(
            "Family QR camera start failed",
            { errorName },
          );

          const detail =
            errorName === "NotAllowedError" ||
            errorName === "SecurityError"
              ? "Camera access was denied by Safari. Allow camera access for this website and try again."
              : errorName === "NotFoundError"
                ? "No available camera was found on this device."
                : errorName === "NotReadableError" ||
                    errorName === "AbortError"
                  ? "The camera is busy or unavailable. Close other apps using the camera and try again."
                  : errorName === "OverconstrainedError"
                    ? "The rear-camera request is not supported by this device."
                    : "The camera could not be started on this device.";

          setScannerMessage(
            `${detail} You can use the manual pass field below.`,
          );
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;

      const current =
        scannerRef.current;

      scannerRef.current = null;

      if (
        current &&
        current.isScanning
      ) {
        void current
          .stop()
          .catch(() => undefined);
      }
    };
  }, [scannerOpen]);

  async function closeScanner() {
    handledScanRef.current = true;

    const scanner =
      scannerRef.current;

    if (
      scanner &&
      scanner.isScanning
    ) {
      try {
        await scanner.stop();
      } catch {
        // Ignore shutdown errors.
      }
    }

    scannerRef.current = null;
    setScannerOpen(false);
    setScannerMessage(null);
  }

  return (
    <div className="mt-3 space-y-4">
      <button
        className="min-h-11 w-full rounded-lg bg-sky-700 px-4 font-semibold text-white"
        onClick={() => {
          setScannerMessage(null);
          setScannerOpen(true);
        }}
        type="button"
      >
        Scan family QR
      </button>

      {scannerOpen ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-950">
                Scan family QR
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                Point this device&apos;s
                camera at the family&apos;s
                QR pass.
              </p>
            </div>

            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              onClick={() => {
                void closeScanner();
              }}
              type="button"
            >
              Cancel
            </button>
          </div>

          <div
            className="mt-4 overflow-hidden rounded-xl bg-black"
            id="family-qr-reader"
          />

          {scannerMessage ? (
            <p
              className="mt-3 text-sm font-semibold text-slate-700"
              role="status"
            >
              {scannerMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          or
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form
        action={action}
        className="space-y-3"
        ref={formRef}
      >
        <input
          name="eventId"
          type="hidden"
          value={eventId}
        />

        <label
          className="block text-sm font-semibold text-slate-700"
          htmlFor="token"
        >
          Enter pass manually
        </label>

        <input
          autoComplete="off"
          className={inputClass}
          id="token"
          minLength={70}
          name="token"
          onChange={(event) =>
            setToken(
              extractFamilyPassToken(
                event.target.value,
              ) ??
                event.target.value,
            )
          }
          required
          value={token}
        />

        {state.message ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {state.message}
          </p>
        ) : null}

        <button
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800 disabled:opacity-60"
          disabled={pending}
        >
          {pending
            ? "Opening family…"
            : "Open family"}
        </button>
      </form>

      <p className="text-xs leading-5 text-slate-500">
        Manual entry remains available if
        the camera is unavailable. A family
        QR only identifies the household;
        staff still confirm every check-in
        and pickup action.
      </p>
    </div>
  );
}
