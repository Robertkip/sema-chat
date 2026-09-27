# The AI-assisted workflow drill (FE-04)

The same feature — a settings form for Sema — built twice, on two branches off one commit.

- `drill/round-one-vague` — one sentence, no context, output accepted unmodified.
- `drill/round-two-spec` — a spec naming the schema library, validation bounds, the
  accessibility contract, and a verification step ("write it, then write tests and run
  them").

Diff: `git diff drill/round-one-vague drill/round-two-spec -- app/settings`

## Correctness

Round one shipped two defects that survive a visual check.

**Temperature validated as a string.** Round one stored `e.target.value` directly and
compared `temperature < "0" || temperature > "2"`. Lexicographically `"10" > "2"` is
`false`, so a temperature of 10 passed validation and reached the payload. I verified
this in a node one-liner before writing it up. Round two puts `z.coerce.number().min(0).max(2)`
in `lib/settings-schema.ts`, and a test asserts the submitted value is the number `0.7`,
not the string `"0.7"`.

**Cancel submitted the form.** Round one's Cancel button carried an `onClick` but no
`type`. A button inside a form defaults to `type="submit"`, so clicking Cancel ran
validation and fired the save path. Round two sets `type="button"` explicitly; a test
clicks Cancel and asserts `onSave` was never called. This is the mistake I would not
have caught by looking at the rendered page — both rounds look identical in a browser.

**A third defect surfaced only at the type check.** Round two's first draft passed all
9 tests yet failed `next build`: `z.coerce.number()` widens the schema's *input* type to
`unknown` while its output stays `number`, so `useForm<Settings>` did not match
`zodResolver`. Tests run on transpiled code and never saw it. Naming `z.input` and
`z.output` separately fixed it. Tests and types catch different classes of error.

## Accessibility

Round one's six `<label>` elements had no `htmlFor` and its inputs had no `id`, so no
control had an accessible name. The labels were decorative text. Round one also leaned
on `placeholder` as a second label, which disappears on focus, and rendered the API key
as `type="text"`.

Round two generates ids from `useId()`, wires `htmlFor`/`id` on every control, sets
`aria-invalid` and `aria-describedby` on error, masks the key behind `type="password"`,
and reports save status through `role="status"` `aria-live="polite"`. The first test
queries every field via `getByLabelText`, so the association is enforced, not assumed.

## Edge cases

Round one had one path: valid or `alert()` — no loading state, no failure state, no
inline errors. Round two handles idle, saving, saved and error, disables submit while
in flight, and renders each message beside the field that failed.

## Review effort

Round one generated in about four minutes and read as finished. Finding its two defects
took roughly forty minutes against the brief — and the string comparison only surfaced
because I was writing a boundary test. Round two took longer to specify and produced 9
tests running in 3.2s. It felt slower and was faster end to end: the review was the test
run rather than my attention.
