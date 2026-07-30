"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens, storeTokens } from "@/lib/auth";

type Status = "loading" | "success" | "error";

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams (must be inside <Suspense>)
// ---------------------------------------------------------------------------
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleCallback = useCallback(async () => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      const messages: Record<string, string> = {
        access_denied: "You declined the authorization request.",
        invalid_application_status:
          "Your application has exceeded its token limit or has been suspended.",
      };
      setErrorMessage(messages[error] ?? `Authorization error: ${error}`);
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMessage("No authorization code received from Raindrop.io.");
      setStatus("error");
      return;
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      storeTokens(tokens);
      setStatus("success");
      // Redirect to home after a short delay so the user sees the success state
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Token exchange failed."
      );
      setStatus("error");
    }
  }, [searchParams, router]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  return (
    <div className="card bg-base-200 border border-base-300/50 shadow-xl w-full max-w-sm">
      <div className="card-body items-center text-center gap-4">
        {status === "loading" && (
          <>
            <span className="loading loading-spinner loading-lg text-primary" />
            <h1 className="text-lg font-semibold">Connecting to Raindrop…</h1>
            <p className="text-sm text-base-content/55">
              Exchanging authorization code for access token
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-success text-5xl">✓</div>
            <h1 className="text-lg font-semibold">Connected!</h1>
            <p className="text-sm text-base-content/55">
              Redirecting you back…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-error text-5xl">✕</div>
            <h1 className="text-lg font-semibold text-error">
              Authentication Failed
            </h1>
            <p className="text-sm text-base-content/55">{errorMessage}</p>
            <button
              id="btn-back-home"
              className="btn btn-primary btn-sm rounded-full mt-2"
              onClick={() => router.push("/")}
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — wraps the inner component in Suspense (required by Next.js App Router
// when useSearchParams() is used in a Client Component during static generation)
// ---------------------------------------------------------------------------
export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-base-100 flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="card bg-base-200 border border-base-300/50 shadow-xl w-full max-w-sm">
            <div className="card-body items-center text-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary" />
              <h1 className="text-lg font-semibold">Loading…</h1>
            </div>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </main>
  );
}
