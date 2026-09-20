"use client";

import { useActionState, useState } from "react";
import { claimHandle, type OnboardingState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Avatar } from "@/components/ui/Avatar";
import { normalizeHandle, checkHandle } from "@/lib/identity/handle";

const INITIAL: OnboardingState = { status: "idle", message: "" };

const FIELD =
  "min-h-[44px] w-full rounded-chip border border-line bg-[rgb(6_7_13/0.6)] px-[14px] text-[14px] " +
  "text-text placeholder:text-ghost focus:border-[rgb(59_232_176/0.45)] focus:outline-none";

export function OnboardingForm({
  next,
  suggestedHandle,
  suggestedName,
}: {
  next: string;
  suggestedHandle: string;
  suggestedName: string;
}) {
  const [state, action, pending] = useActionState(claimHandle, INITIAL);
  const [handle, setHandle] = useState(suggestedHandle);
  const [displayName, setDisplayName] = useState(suggestedName);

  // Mirrors the server rule so the user sees the problem before submitting.
  const local = checkHandle(handle);
  const handleError = state.field === "handle" ? state.message : null;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next} />

      <div className="flex items-center gap-4">
        <Avatar seed={handle || "preview"} name={displayName || handle || "You"} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-text">{displayName || "Your name"}</p>
          <p className="truncate font-mono text-[12px] text-dim">@{handle || "handle"}</p>
        </div>
      </div>

      <div>
        <label htmlFor="handle" className="mb-2 block">
          <Label>Handle</Label>
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[14px] text-ghost">@</span>
          <input
            id="handle"
            name="handle"
            value={handle}
            onChange={(e) => setHandle(normalizeHandle(e.target.value))}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={handleError ? true : undefined}
            aria-describedby="handle-help"
            className={FIELD}
          />
        </div>
        <p
          id="handle-help"
          className={`mt-2 text-[12px] ${handleError ? "text-[#FF8A9C]" : "text-ghost"}`}
        >
          {handleError ??
            (local.ok
              ? "Permanent. This is your address in the world: /u/" + local.handle
              : local.reason)}
        </p>
      </div>

      <div>
        <label htmlFor="display_name" className="mb-2 block">
          <Label>Display name</Label>
        </label>
        <input
          id="display_name"
          name="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={48}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="country_code" className="mb-2 block">
          <Label>Country code (optional)</Label>
        </label>
        <input
          id="country_code"
          name="country_code"
          maxLength={2}
          placeholder="IN"
          autoCapitalize="characters"
          className={FIELD}
          aria-describedby="country-help"
        />
        <p id="country-help" className="mt-2 text-[12px] text-ghost">
          Two letters. Places your future nation on the world atlas.
        </p>
      </div>

      <div>
        <label htmlFor="bio" className="mb-2 block">
          <Label>Bio (optional)</Label>
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={280}
          className={`${FIELD} min-h-[88px] resize-y py-3 leading-relaxed`}
        />
      </div>

      {state.status === "error" && !state.field ? (
        <p role="alert" className="text-[12.5px] text-[#FF8A9C]">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth disabled={pending || !local.ok}>
        {pending ? "Claiming…" : "Claim handle and enter"}
      </Button>
    </form>
  );
}
