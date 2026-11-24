import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      try {
        // 1. Check for errors in the hash or search params
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const error = urlParams.get("error_description") || hashParams.get("error_description") || urlParams.get("error") || hashParams.get("error");
        if (error) {
          throw new Error(error);
        }

        // 2. Handle code exchange if PKCE code is returned
        const code = urlParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // 3. Verify session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          // Wait briefly in case supabase is still parsing hash
          await new Promise((res) => setTimeout(res, 500));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            throw new Error("Unable to establish an authenticated session. Please try logging in again.");
          }
        }

        if (mounted) {
          toast.success("Signed in successfully with Google!");
          navigate({ to: "/dashboard", replace: true });
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : "Authentication failed. Please try again.";
        console.error("Auth callback error:", err);
        setErrorMsg(msg);
        toast.error(msg);
        setTimeout(() => {
          navigate({ to: "/auth", replace: true });
        }, 3000);
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {errorMsg ? (
        <div className="max-w-md space-y-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-6">
          <h2 className="text-lg font-bold text-destructive">Authentication Error</h2>
          <p className="text-sm text-foreground/80">{errorMsg}</p>
          <p className="text-xs text-muted-foreground">Redirecting you back to login page...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <h2 className="text-lg font-semibold text-primary">Completing Google Sign In...</h2>
          <p className="text-sm text-foreground/70">Setting up your secure member session</p>
        </div>
      )}
    </div>
  );
}
