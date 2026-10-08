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

type CameraState =
  | "closed"
  | "ready"
  | "starting"
  | "active"
  | "insecure"
  | "unsupported"
  | "permission-denied"
  | "not-found"
  | "unavailable"
  | "failed";

const cameraMessages: Record<CameraState, string> = {
  closed: "",
  ready:
    "Camera access has not been requested. Tap Start camera when you are ready.",
  starting: "Starting camera…",
  active: "Point the camera at the family QR code.",
  insecure:
    "Camera scanning requires a secure HTTPS connection. Open this page using the secure site address.",
  unsupported:
    "This browser does not provide the camera features required for scanning.",
  "permission-denied":
    "Camera access was denied. On iPhone or iPad, allow Camera for this website or installed app. On Android, allow Camera in the site's permissions. Then return and try again.",
  "not-found": "No available camera was found on this device.",
  unavailable:
    "The camera is busy or unavailable. Close other apps using the camera and try again.",
  failed:
    "The scanner could not start on this device. Reload the page and try again, or use the manual pass field below.",
};

function cameraFailureState(error: unknown): CameraState {
  const detail =
    error instanceof Error
      ? `${error.name} ${error.message}`.toLowerCase()
      : String(error).toLowerCase();

  if (
    detail.includes("notallowederror") ||
    detail.includes("permission denied") ||
    detail.includes("permissiondismissederror") ||
    detail.includes("securityerror")
  ) {
    return "permission-denied";
  }

  if (
    detail.includes("notfounderror") ||
    detail.includes("devicesnotfounderror") ||
    detail.includes("no cameras")
  ) {
    return "not-found";
  }

  if (
    detail.includes("notreadableerror") ||
    detail.includes("trackstarterror") ||
    detail.includes("aborterror") ||
    detail.includes("could not start video source")
  ) {
    return "unavailable";
  }

  return "failed";
}

function stopContainerMediaTracks() {
  const video = document
    .getElementById("family-qr-reader")
    ?.querySelector("video");
  const stream = video?.srcObject;

  if (
    video &&
    typeof MediaStream !== "undefined" &&
    stream instanceof MediaStream
  ) {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

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

  const [cameraState, setCameraState] =
    useState<CameraState>("closed");

  const [scanMessage, setScanMessage] =
    useState<string | null>(null);

  const formRef =
    useRef<HTMLFormElement>(null);

  const scannerRef =
    useRef<Html5Qrcode | null>(null);

  const handledScanRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  async function stopScanner() {
    handledScanRef.current = true;

    const scanner = scannerRef.current;
    scannerRef.current = null;

    try {
      if (scanner?.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Track cleanup below is the final fallback.
    }

    stopContainerMediaTracks();

    try {
      scanner?.clear();
    } catch {
      // The scanner may already have cleared its rendering surface.
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      void stopScanner();
    };
  }, []);

  function openScanner() {
    setScannerOpen(true);
    setScanMessage(null);

    if (!window.isSecureContext) {
      setCameraState("insecure");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("ready");
  }

  async function startScanner() {
    if (!window.isSecureContext) {
      setCameraState("insecure");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    handledScanRef.current = false;
    setScanMessage(null);
    setCameraState("starting");

    const scanner = new Html5Qrcode(
      "family-qr-reader",
    );

    scannerRef.current = scanner;

    try {
      // Start is invoked directly from this button handler so mobile
      // browsers retain the user-gesture permission context.
      const startPromise = scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: (width, height) => {
            const edge = Math.max(
              140,
              Math.min(
                250,
                width - 32,
                height - 32,
              ),
            );

            return {
              width: edge,
              height: edge,
            };
          },
          videoConstraints: {
            facingMode: {
              ideal: "environment",
            },
          },
        },
        async (decodedText) => {
          if (
            handledScanRef.current ||
            !mountedRef.current
          ) {
            return;
          }

          const pass =
            extractFamilyPassToken(
              decodedText,
            );

          if (!pass) {
            setScanMessage(
              "That QR does not appear to be a valid family pass.",
            );
            return;
          }

          handledScanRef.current = true;
          setScanMessage(
            "Family pass recognized. Opening family…",
          );
          setToken(pass);

          await stopScanner();

          if (!mountedRef.current) {
            return;
          }

          setScannerOpen(false);
          setCameraState("closed");

          window.setTimeout(() => {
            formRef.current?.requestSubmit();
          }, 0);
        },
        () => {
          // Individual decode misses are expected while scanning.
        },
      );

      await startPromise;

      if (
        !mountedRef.current ||
        scannerRef.current !== scanner
      ) {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch {
          stopContainerMediaTracks();
        }

        return;
      }

      setCameraState("active");
    } catch (error) {
      const failureState =
        cameraFailureState(error);

      console.error(
        "Family QR camera start failed",
        {
          errorName: failureState,
        },
      );

      await stopScanner();

      if (mountedRef.current) {
        setCameraState(failureState);
      }
    }
  }
  async function closeScanner() {
    await stopScanner();

    if (!mountedRef.current) {
      return;
    }

    setScannerOpen(false);
    setCameraState("closed");
    setScanMessage(null);
  }

  const canStart = [
    "ready",
    "permission-denied",
    "not-found",
    "unavailable",
    "failed",
  ].includes(cameraState);

  return (
    <div className="mt-3 min-w-0 space-y-4">
      <button
        className="min-h-11 w-full rounded-lg bg-sky-700 px-4 font-semibold text-white"
        onClick={openScanner}
        type="button"
      >
        Scan family QR
      </button>

      {scannerOpen ? (
        <div className="min-w-0 max-w-full rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-950">
                Scan family QR
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Camera access starts only after you tap Start camera. The QR
                identifies the household but never authorizes pickup or
                release.
              </p>
            </div>

            <button
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              onClick={() => {
                void closeScanner();
              }}
              type="button"
            >
              Close
            </button>
          </div>

          <div
            className="mt-4 min-h-40 w-full max-w-full overflow-hidden rounded-xl bg-black [&_canvas]:!max-w-full [&_video]:!h-auto [&_video]:!max-w-full [&_video]:!w-full"
            id="family-qr-reader"
          />

          <p
            className={`mt-3 rounded-lg p-3 text-sm font-semibold leading-6 ${
              cameraState === "active"
                ? "bg-emerald-100 text-emerald-900"
                : cameraState === "ready" || cameraState === "starting"
                  ? "bg-white text-slate-700"
                  : "bg-amber-100 text-amber-950"
            }`}
            role={
              [
                "permission-denied",
                "not-found",
                "unavailable",
                "failed",
              ].includes(cameraState)
                ? "alert"
                : "status"
            }
          >
            {scanMessage ?? cameraMessages[cameraState]}
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            {canStart ? (
              <button
                className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white"
                onClick={() => void startScanner()}
                type="button"
              >
                {cameraState === "ready"
                  ? "Start camera"
                  : "Try camera again"}
              </button>
            ) : null}

            {cameraState === "active" ? (
              <button
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800"
                onClick={() => void closeScanner()}
                type="button"
              >
                Stop camera
              </button>
            ) : null}
          </div>
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
        Manual family search and pass entry remain available if the camera is
        unavailable. A family QR only identifies the household; staff still
        confirm every check-in and pickup action.
      </p>
    </div>
  );
}
