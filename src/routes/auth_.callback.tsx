import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      const url = new URL(window.location.href);
      const params = [url.searchParams, new URLSearchParams(url.hash.slice(1))];
      if (params.some((p) => p.get("error") === "access_denied")) {
        setErrorMsg("Google sign-in was cancelled. You can try again or sign in with email.");
        return;
      }

      try {
        if (
          params.some((p) => p.has("error") || p.has("error_code") || p.has("error_description"))
        ) {
          throw new Error("OAuth provider returned an error");
        }

        // The browser client processes the callback URL during initialization.
        const { error: callbackError } = await supabase.auth.initialize();
        if (callbackError) throw callbackError;

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session)
          throw error ?? new Error("Missing session after Google sign-in");

        if (!mounted) return;
        await navigate({ to: "/dashboard", replace: true });
        toast.success("Signed in successfully with Google.");
      } catch {
        if (mounted) {
          setErrorMsg("Could not complete Google sign-in. Please try again or sign in with email.");
        }
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
          <h1 className="text-lg font-bold text-destructive">Google sign-in incomplete</h1>
          <p role="alert" className="text-sm text-foreground/80">
            {errorMsg}
          </p>
          <Button asChild variant="outline">
            <Link to="/auth" replace>
              Back to sign in
            </Link>
          </Button>
        </div>
      ) : (
        <div role="status" className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <h2 className="text-lg font-semibold text-primary">Completing Google Sign In...</h2>
          <p className="text-sm text-foreground/70">Setting up your secure member session</p>
        </div>
      )}
    </div>
  );
}
