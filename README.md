# ng-form-saver

Lightweight Angular utility that persistently saves form state (values + simple meta like dirty/touched) to storage (default: localStorage) and restores it on attach. Designed to work with both Reactive Forms and Template-driven Forms (ngForm). Useful for long forms, multi-step forms, or protecting user input across reloads and navigation.

This README documents the public API, configuration, examples, SSR notes, and common use-cases.

https://www.npmjs.com/package/ng-form-saver 

## Features

- Automatically persist form values and basic meta (dirty/touched)
- Works with Reactive Forms (`FormGroup`, `FormArray`) and template-driven `NgForm`
- Configurable debounce, storage backend, and key-generation
- Supports migrations via a simple migrate API for evolving saved shapes
- Standalone-friendly and includes a `provideFormSaver` helper to set defaults

## Install / Build

During development inside this workspace you can run the host demo application. From the workspace root:

```bash
npm install
npm start
```

- Open http://localhost:4200/demo to view the demo form.

To build the library itself:

```bash
ng build ng-form-saver
```

To publish (after build):

```bash
cd dist/ng-form-saver
npm publish
```

## Quick Start (Reactive Forms)

1) Import the library symbols from the published package (or for local dev you may import from the project path):

2) Use the `formSaver` directive on a form. The simplest usage is to provide a string key.

Template example:

```html
<!-- Reactive form -->
<form [formGroup]="profileForm" formSaver="profile-form">
   <input formControlName="name" />
   <input formControlName="email" />
   <button type="submit">Save</button>
</form>
```

Component setup (minimal):

```ts
import { FormGroup, FormControl } from '@angular/forms';

profileForm = new FormGroup({
   name: new FormControl(''),
   email: new FormControl('')
});
```

That’s it — the directive will persist the form value to localStorage under key `profile-form` and will patch the control with saved values when attached.

## Template-driven Forms (NgForm)

```html
<form #f="ngForm" formSaver="contact-form">
   <input name="fullName" ngModel />
   <input name="phone" ngModel />
</form>
```

The directive detects the active `NgForm` or `FormGroupDirective` automatically and will throw an error if no form control is present.

## Directive Input Variants

The directive accepts multiple input forms via the `formSaver` input binding:

- `"my-key"` — string key used in storage
- `true` / `false` — boolean shorthand (true means attach with defaults)
- `''` (empty) — attach with defaults (service will resolve key)
- `Partial<FormSaverOptions>` — options object

Example with options:

```html
<form [formGroup]="form" [formSaver]="{ key: 'order', debounceTime: 500, clearOnSubmit: true }">
   ...
</form>
```

## Programmatic API — FormSaverService

You can attach programmatically to an `AbstractControl` (FormGroup, FormArray or FormControl) using `FormSaverService.attach`.

```ts
import { FormSaverService } from 'ng-form-saver';

constructor(private saver: FormSaverService) {}

const handle = this.saver.attach(this.form, { key: 'checkout', debounceTime: 200 });

// later
handle.clear(); // removes storage entry
handle.destroy(); // stop persisting
```

AttachHandle (returned from attach):

- `key: string` — resolved storage key
- `control: AbstractControl` — the control attached
- `clear(): void` — remove saved payload
- `destroy(): void` — unsubscribe from valueChanges and stop persisting

## Options (FormSaverOptions)

| Property | Type | Default | Description |
|---|---:|---|---|
| key | string | — | Storage key. If omitted and `autoKey` is true, key is derived from current route (requires Router). Otherwise defaults to 'form-saver'. |
| autoKey | boolean | false | Derive key from current route URL (requires Router in DI). |
| debounceTime | number | 300 | Debounce ms for valueChanges persistence. |
| version | number | — | Optional version identifier for saved payload. Works with migrations. |
| migrations | FormSaverMigration[] | [] | Array of migrations to bring old payloads forward. |
| clearOnSubmit | boolean | false | When true, the directive will clear the saved payload on ngSubmit. |
| storage | StorageLike | localStorage (fallback to in-memory) | Custom storage backend implementing getItem/setItem/removeItem. |

### Default provider

The library exposes an injection token `FORM_SAVER_DEFAULT_OPTIONS` with defaults. Use `provideFormSaver(defaults)` to configure defaults for your app:

```ts
import { provideFormSaver } from 'ng-form-saver';

bootstrapApplication(App, {
   providers: [
      provideFormSaver({ debounceTime: 500, clearOnSubmit: true })
   ]
});
```

This will change behavior of the directive and programmatic attach when a specific value isn't provided.

## Migrations (versioned payloads)

Saved payloads include an optional `v` field (version). To migrate older payloads to a new shape, pass `migrations` to options or via default provider. Each migration has `from`, `to`, and `migrate(data)`.

Example migration:

```ts
const migrations = [
   { from: 1, to: 2, migrate: (data) => ({ ...data, createdAt: Date.now() }) }
];

this.saver.attach(this.form, { key: 'profile', version: 2, migrations });
```

When a saved payload with `v = 1` is found, the code above will apply the migrate function and set `v` to `2`.

## Custom storage

If you need to persist to a server or to `sessionStorage` or a cookie-backed storage, implement the `StorageLike` interface and pass it via options:

```ts
const customStorage = {
   getItem: (k: string) => myStore.get(k) ?? null,
   setItem: (k: string, v: string) => myStore.set(k, v),
   removeItem: (k: string) => myStore.delete(k)
};

this.saver.attach(this.form, { key: 'cart', storage: customStorage });
```

## Use-cases

- Long forms where users may accidentally navigate away or refresh
- Multi-step forms where intermediate state should persist across steps
- Admin dashboards with complex filters — preserve filter forms across sessions
- Offline/slow networks where saving to localStorage provides resilience

## SSR (Server-side rendering) notes

When rendering on the server, ensure your app bootstraps with a `BootstrapContext` forwarded to `bootstrapApplication`. Example server bootstrap (the library's demo app uses this pattern):

```ts
// src/main.server.ts
import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);
export default bootstrap;
```

Also remember `localStorage` is not available on the server — the library falls back to an in-memory Map storage automatically.

## API Reference (exports)

- `FormSaverDirective` — directive selector: `[formSaver]` — attach to a `<form>` element.
- `FormSaverService` — programmatic API to attach and control saves.
- `FORM_SAVER_DEFAULT_OPTIONS` — injection token for defaults.
- `provideFormSaver(defaults)` — helper provider factory to register defaults.
- Types exported in `form-saver.types`:
   - `FormSaverOptions`, `FormSaverMigration`, `StorageLike`, `AttachHandle`.

## Troubleshooting

- Error "[formSaver] must be used on a form...": make sure the element with the directive has either `ReactiveFormsModule`'s `FormGroupDirective` or `FormsModule`'s `NgForm` in scope (i.e., the form is a real Angular form control).
- NG040 Missing Platform on server: ensure `bootstrapApplication` is called with the `BootstrapContext` when rendering on the server (see SSR notes).

## Demo and examples

This repository includes a small demo application under `src/` which mounts a demo route at `/demo`. The demo shows a reactive form using the directive, a programmatic example using the service, and a button to clear the saved payload.

Run the demo locally:

```bash
npm start
# browse http://localhost:4200/demo
```

## Contributing

Contributions, bug reports and PRs are welcome. Please follow the standard Angular library conventions and add tests for new behavior.

## License

MIT

