"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MODELS,
  defaultSettings,
  settingsSchema,
  type Settings,
  type SettingsInput,
} from "@/lib/settings-schema";

type SaveState = "idle" | "saving" | "saved" | "error";

export function SettingsForm({
  onSave,
}: {
  onSave?: (values: Settings) => Promise<void>;
}) {
  const formId = useId();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showKey, setShowKey] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsInput, unknown, Settings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaultSettings,
    mode: "onBlur",
  });

  const fieldId = (name: string) => `${formId}-${name}`;
  const errorId = (name: string) => `${formId}-${name}-error`;

  async function onSubmit(values: Settings) {
    setSaveState("saving");
    try {
      await onSave?.(values);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <Field
        id={fieldId("displayName")}
        label="Display name"
        error={errors.displayName?.message}
        errorId={errorId("displayName")}
      >
        <input
          id={fieldId("displayName")}
          autoComplete="nickname"
          aria-invalid={!!errors.displayName}
          aria-describedby={errors.displayName ? errorId("displayName") : undefined}
          className={inputClass(!!errors.displayName)}
          {...register("displayName")}
        />
      </Field>

      <Field
        id={fieldId("email")}
        label="Email"
        error={errors.email?.message}
        errorId={errorId("email")}
      >
        <input
          id={fieldId("email")}
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? errorId("email") : undefined}
          className={inputClass(!!errors.email)}
          {...register("email")}
        />
      </Field>

      <Field
        id={fieldId("apiKey")}
        label="API key"
        hint="Leave blank to use the server key."
        error={errors.apiKey?.message}
        errorId={errorId("apiKey")}
      >
        <div className="flex gap-2">
          <input
            id={fieldId("apiKey")}
            type={showKey ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!errors.apiKey}
            aria-describedby={errors.apiKey ? errorId("apiKey") : undefined}
            className={inputClass(!!errors.apiKey) + " flex-1"}
            {...register("apiKey")}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            aria-pressed={showKey}
            className="rounded-md border border-gray-300 px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <Field
        id={fieldId("model")}
        label="Model"
        error={errors.model?.message}
        errorId={errorId("model")}
      >
        <select
          id={fieldId("model")}
          aria-invalid={!!errors.model}
          aria-describedby={errors.model ? errorId("model") : undefined}
          className={inputClass(!!errors.model)}
          {...register("model")}
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id={fieldId("temperature")}
        label="Temperature"
        hint="Between 0 and 2. Lower is more deterministic."
        error={errors.temperature?.message}
        errorId={errorId("temperature")}
      >
        <input
          id={fieldId("temperature")}
          type="number"
          step="0.1"
          min={0}
          max={2}
          inputMode="decimal"
          aria-invalid={!!errors.temperature}
          aria-describedby={errors.temperature ? errorId("temperature") : undefined}
          className={inputClass(!!errors.temperature)}
          {...register("temperature")}
        />
      </Field>

      <div className="flex items-center gap-2">
        <input
          id={fieldId("notifications")}
          type="checkbox"
          className="size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          {...register("notifications")}
        />
        <label htmlFor={fieldId("notifications")} className="text-sm">
          Enable notifications
        </label>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset(defaultSettings);
            setSaveState("idle");
          }}
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Cancel
        </button>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {saveState === "saved" && <span className="text-green-700">Settings saved.</span>}
        {saveState === "error" && (
          <span className="text-red-700">Could not save settings. Try again.</span>
        )}
      </p>
    </form>
  );
}

function inputClass(hasError: boolean) {
  return [
    "rounded-md border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
    hasError ? "border-red-600" : "border-gray-300",
  ].join(" ");
}

function Field({
  id,
  label,
  hint,
  error,
  errorId,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  errorId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint && <p className="text-xs opacity-70">{hint}</p>}
      {children}
      {error && (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
