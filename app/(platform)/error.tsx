"use client";

import { ErrorState } from "@/components/feedback/error-state";

type PlatformErrorProps = Readonly<{
  error: Error & {
    digest?: string;
  };
  unstable_retry: () => void;
}>;

export default function PlatformError({
  unstable_retry,
}: PlatformErrorProps) {
  return <ErrorState onRetry={unstable_retry} />;
}
