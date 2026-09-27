import { z } from "zod";

export const MODELS = [
  { value: "claude-opus-5", label: "Claude Opus 5" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
] as const;

const modelValues = MODELS.map((m) => m.value) as [string, ...string[]];

export const settingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or fewer"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  apiKey: z
    .string()
    .trim()
    .regex(/^sk-ant-[A-Za-z0-9_-]{8,}$/, "API key must start with sk-ant- ")
    .or(z.literal("")),
  model: z.enum(modelValues, { message: "Choose a model" }),
  // coerce: a number input yields a string, and "10" > "2" is false as a string.
  temperature: z.coerce
    .number({ message: "Temperature must be a number" })
    .min(0, "Temperature must be at least 0")
    .max(2, "Temperature must be at most 2"),
  notifications: z.boolean(),
});

// z.coerce widens the INPUT type to unknown while the OUTPUT stays number, so the
// two have to be named separately or react-hook-form's generics will not line up.
export type SettingsInput = z.input<typeof settingsSchema>;
export type Settings = z.output<typeof settingsSchema>;

export const defaultSettings: SettingsInput = {
  displayName: "",
  email: "",
  apiKey: "",
  model: "claude-sonnet-5",
  temperature: 0.7,
  notifications: true,
};
