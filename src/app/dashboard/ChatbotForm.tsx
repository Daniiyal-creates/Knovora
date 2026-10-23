"use client";

import { useActionState } from "react";
import type { ChatbotFormState } from "./actions";
import type { Chatbot } from "@/lib/supabase/types";

type Props = {
  mode: "create" | "edit";
  action: (prev: ChatbotFormState, formData: FormData) => Promise<ChatbotFormState>;
  chatbot?: Chatbot;
};

export function ChatbotForm({ mode, action, chatbot }: Props) {
  const [state, formAction, pending] = useActionState<ChatbotFormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {chatbot ? <input type="hidden" name="id" value={chatbot.id} /> : null}

      <Field label="Name" error={fe.name}>
        <input
          name="name"
          required
          defaultValue={chatbot?.name ?? ""}
          placeholder="Support Assistant"
          className="input"
        />
      </Field>

      <Field label="Purpose" hint="What is this bot for? Shown to the model as context." error={fe.purpose}>
        <textarea
          name="purpose"
          rows={2}
          defaultValue={chatbot?.purpose ?? ""}
          placeholder="Answers customer questions about our products and policies."
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Language" error={fe.language}>
          <input name="language" defaultValue={chatbot?.language ?? "en"} className="input" />
        </Field>
        <Field label="Tone" error={fe.tone}>
          <input
            name="tone"
            defaultValue={chatbot?.tone ?? ""}
            placeholder="friendly and professional"
            className="input"
          />
        </Field>
      </div>

      <Field
        label="Custom instructions"
        hint="Optional. Added on top of built-in grounding rules."
        error={fe.system_instructions}
      >
        <textarea
          name="system_instructions"
          rows={4}
          defaultValue={chatbot?.system_instructions ?? ""}
          placeholder="e.g. Always offer to connect the user with a human for refunds."
          className="input"
        />
      </Field>

      {mode === "edit" ? (
        <Field
          label="Allowed embed domains"
          hint="One per line. Leave empty to allow any site. Restricts where the public chat API accepts requests from."
        >
          <textarea
            name="allowed_domains"
            rows={3}
            defaultValue={(chatbot?.allowed_domains ?? []).join("\n")}
            placeholder={"example.com\nwww.example.com"}
            className="input"
          />
        </Field>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 font-medium text-brand-fg hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : mode === "create" ? "Create chatbot" : "Save changes"}
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(212 212 212);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus { outline: 2px solid #4f46e5; outline-offset: 1px; }
      `}</style>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
