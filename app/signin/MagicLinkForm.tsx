"use client";

import { useActionState } from "react";
import { sendMagicLink, type AuthFormState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";

const INITIAL: AuthFormState = { status: "idle", message: "" };

export function MagicLinkForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, INITIAL);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />

      <div>
        <Label as="div" className="mb-2">
          Or use an email link
        </Label>
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-describedby={state.status === "idle" ? undefined : "magic-link-status"}
          className="min-h-[44px] w-full rounded-chip border border-line bg-[rgb(6_7_13/0.6)] px-[14px] text-[14px] text-text placeholder:text-ghost focus:border-[rgb(59_232_176/0.45)] focus:outline-none"
        />
      </div>

      <Button type="submit" variant="outline" accent="signal" fullWidth disabled={pending}>
        {pending ? "Sending…" : "Send magic link"}
      </Button>

      {state.status !== "idle" ? (
        <p
          id="magic-link-status"
          role="status"
          className={`text-[12.5px] leading-relaxed ${
            state.status === "error" ? "text-[#FF8A9C]" : "text-flux"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
