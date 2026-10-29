# Live validation (`@/components/shared/live-validation`)

Inline validation for every form, "reward early, punish late" (decision 16.700).

| When                              | What the person sees                                                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typing a field for the first time | Nothing. No message while the first attempt is under way.                                                                                                                         |
| Leaving the field (first blur)    | The field's message, if any, under it (`FieldShell`), with `aria-invalid` and `aria-describedby`.                                                                                 |
| Every change after that           | The message follows the value: it disappears on the keystroke that fixes it and comes back if it breaks again.                                                                    |
| Submit                            | Every field is checked, the submit is stopped while anything is invalid, and focus moves to the first invalid control (inside a radio group: its checked option, else the first). |
| Server answer with `fieldErrors`  | Each message sits under its field and clears as soon as that field is edited (and stays cleared).                                                                                 |

The messages are the **server action's own zod schema**, run on the client:
the same trims, whitespace rules and words. Never write a second, looser copy
of a rule for the browser.

## Use

```tsx
const [values, setValues] = useState({ email: "", name: "" });

const live = useLiveValidation({
  schema: createUserSchema,          // what the action parses
  values,                            // typed as the schema reads them
  serverErrors: state.createUserError, // the action's flatten().fieldErrors
  controlIds: { email: "user-email" }, // only when the id is not the field name
});

<form ref={live.ref} action={submit} noValidate>
  <FormInput htmlfor="user-email" errorName={live.errorOf("email")} … />
  <SelectField htmlfor="role" errorName={live.errorOf("role")} … />
</form>
```

- `ref` goes on the form, or on any element inside it that holds the fields
  (the checklist's step component). Blur is read from it and the submit from
  its form: an invalid submit is `preventDefault`ed before React dispatches a
  `<form action>`.
- `noValidate` on the form: the browser's bubble would block the submit event
  and show its own English-ish message instead.
- `errorOf(field)` returns `string[] | undefined`, the shape every field
  component already takes (`errorName`, `error`). `messageOf` returns a string.
- Values must be **controlled** (React state). An uncontrolled field has no
  value to validate.

## Options

| Option             | For                                                                                                                                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`           | The action's schema. A `.refine()`/`.superRefine()` on the object is supported: fields are checked with `.shape`, object-level issues are added per field.                                                                                                                                         |
| `values`           | Current values. Store what the schema expects (`undefined` for an empty number, booleans for yes/no), not display strings.                                                                                                                                                                         |
| `rules(values)`    | What the schema cannot know: rules between fields that must not wait for every field to be valid, and rules against data **already loaded** (the vehicle's mileage). Return `{ field: message \| null }`. Never a request per keystroke; if a rule needs the network, feed it `useDebouncedValue`. |
| `fields`           | Which fields a submit checks, in form order. Default: the schema's keys plus the rules'. List them when the schema has fields the form does not show.                                                                                                                                              |
| `serverErrors`     | The action's field errors object. A new object is a new answer.                                                                                                                                                                                                                                    |
| `controlIds`       | `field → control id` when the `htmlFor` is not the field name.                                                                                                                                                                                                                                     |
| `resetKey`         | A new value starts over (a dialog reused while mounted).                                                                                                                                                                                                                                           |
| `validateOnSubmit` | `false` when the form drives the submit itself (wizards, the quote steps): call `validate(fields)` and `preventDefault` yourself.                                                                                                                                                                  |

Returned: `ref`, `errorOf`, `messageOf`, `touch(field)` (a control with no
focus of its own: a file drop, a picked record), `validate(fields?)`,
`isValid()`, `isFieldValid(field)` (a "done" tick), `shakeOf(field)`, `reset()`.

## Controls

| Control                                              | How it participates                                                                                                                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormInput`, `TextareaField`, any `FieldShell` child | id = `htmlFor`. Nothing to add.                                                                                                                                                                     |
| `SelectField` (Radix), `DatePickerField`             | The trigger carries the id. Opening the list or calendar is not "leaving": focus moving into the control's own popup (`aria-controls`, a Radix popper, a listbox) is ignored.                       |
| Radio group, checkbox                                | Matched by `name`. Call `touch(field)` in `onChange` when a choice is a complete answer. A `fieldset`/`role="radiogroup"` carrying `aria-invalid` is fine: the submit focuses the option inside it. |
| Comboboxes (cmdk) whose input id a library owns      | Put `data-live-field="<field>"` on a wrapper (user dialog's driver and profile searches). Focus moving inside the wrapper is not leaving.                                                           |
| File inputs / drop areas                             | `touch(key)` on change; give the drop area `aria-invalid` and `aria-describedby` so the submit can focus it (checklist `photo-upload.tsx`).                                                         |

Buttons that leave the form without submitting (Cancelar, Voltar) carry
`IGNORE_BLUR_ATTRIBUTE` so a pointer press on them does not paint the field the
person just left. A keyboard Tab onto them still counts as leaving.

## Error styling

- Style from the error, never from "required": a required control is neutral
  (asterisk only) until it is actually invalid (`aria-[invalid=true]:` classes
  or the message itself).
- Motion answers the attempt: `shakeOf(field)` is true only for a short while
  after a failed submit/`validate()`, so `cn(..., live.shakeOf(f) && "animate-tp-shake")`
  never fires on a blur or a keystroke.

## Submit buttons

`canSubmitForm({ isEdit, isDirty })`: a **create** form's submit is always
enabled — pressing it is how the person finds out what is missing; a disabled
button hides why. An **edit** form's stays disabled while nothing changed
(decision 2.5). Disable only for real states: pending, data still loading, a
captcha not solved.

## Performance

Messages are derived while rendering, each field at most once per render and
only when asked for. Typing costs no extra render; the only state is which
fields were visited (one render on the first blur of a field, one per submit).
The visit is recorded on a timer after the blur so the render never lands
while `<body>` holds focus (Radix's FocusScope would pull focus back to the
dialog).

## Reference forms

- `features/user/form-dialog` — schema + a client rule (the link) + server errors + edit dirty rule.
- `features/vehicle-checklist/create-form/submit.tsx` and `update-form/submit.tsx` — a data-dependent rule (`lib/mileage-rule.ts`, only where the client really knows: untouched default date, create only), photos (`lib/live-rules.ts`), selects and the date picker.
- Not migrated yet: the admin `MasterUserFormDialog` (follow-up; copy the user dialog).
- `components/auth/*` — login, forgot, reset (object refine: the confirmation), 2FA (OTP in a `FieldShell`).
- `components/contact-form`, `components/quote-form` — public forms; the quote validates per step with `validate(STEP_FIELDS[step])`.

Tests: `tests/unitaires/live-validation.test.tsx` (the primitive),
`live-validation-forms.test.ts` (the forms), `live-validation-rules.test.ts`
(schemas and rules).
