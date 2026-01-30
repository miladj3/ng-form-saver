# ng-form-saver

[![npm version](https://img.shields.io/npm/v/ng-form-saver.svg)](https://www.npmjs.com/package/ng-form-saver)
[![CI](https://github.com/miladj3/ng-form-saver/actions/workflows/ci.yml/badge.svg)](https://github.com/miladj3/ng-form-saver/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lightweight Angular utility that persistently saves form state (values + simple meta like dirty/touched) to storage (default: localStorage) and restores it on attach. Designed to work with both Reactive Forms and Template-driven Forms (ngForm). Useful for long forms, multi-step forms, or protecting user input across reloads and navigation.

This README documents the public API, configuration, examples, SSR notes, and common use-cases.

Supported Angular versions: **20.x and up**

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start-reactive-forms)
- [Template-driven Forms](#template-driven-forms-ngform)
- [Directive Input Variants](#directive-input-variants)
- [On-Demand Save](#on-demand-save)
- [Programmatic API](#programmatic-api--formsaverservice)
- [Options](#options-formsaveroptions)
- [Default Provider](#default-provider)
- [Migrations](#migrations-versioned-payloads)
- [TTL (Time to Live)](#ttl-time-to-live)
- [Custom Storage](#custom-storage)
- [Use-cases](#use-cases)
- [SSR Notes](#ssr-server-side-rendering-notes)
- [API Reference](#api-reference-exports)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- ✅ Automatically persist form values and basic meta (dirty/touched)
- ✅ Works with Reactive Forms (`FormGroup`, `FormArray`) and template-driven `NgForm`
- ✅ **On-demand save** — manually trigger save via handle output or programmatic API
- ✅ Configurable debounce, storage backend, and key-generation
- ✅ Supports migrations via a simple migrate API for evolving saved shapes
- ✅ TTL (Time to Live) support for automatic data expiration
- ✅ Custom storage backends (sessionStorage, IndexedDB, API, etc.)
- ✅ SSR-safe with automatic fallback to in-memory storage
- ✅ Standalone-friendly and includes a `provideFormSaver` helper to set defaults

## Installation

Install from npm:

```bash
npm install ng-form-saver
```

Or with yarn:

```bash
yarn add ng-form-saver
```

Or with pnpm:

```bash
pnpm add ng-form-saver
```

### Development Setup

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

1. Import the library symbols from the published package (or for local dev you may import from the project path):

2. Use the `formSaver` directive on a form. The simplest usage is to provide a string key.

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
import { FormGroup, FormControl } from "@angular/forms";

profileForm = new FormGroup({
  name: new FormControl(""),
  email: new FormControl(""),
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
<form [formGroup]="form" [formSaver]="{ key: 'order', debounceTime: 500, clearOnSubmit: true }">...</form>
```

## On-Demand Save

Instead of relying solely on debounced auto-save, you can manually trigger a save at any time using the `formSaverHandle` output. This is useful for:

- Save buttons that persist form state immediately
- Critical form actions where you want to ensure data is saved
- Forms with very long debounce times where immediate save is needed

### Template Example with On-Demand Save

```html
<form [formGroup]="checkoutForm" formSaver="checkout" (formSaverHandle)="onHandleReady($event)">
  <input formControlName="cardNumber" placeholder="Card Number" />
  <input formControlName="expiry" placeholder="MM/YY" />
  <input formControlName="cvv" placeholder="CVV" />

  <!-- Manual save button -->
  <button type="button" (click)="saveNow()">Save Progress</button>
  <button type="submit">Complete Payment</button>
</form>
```

### Component Example

```typescript
import { Component } from "@angular/core";
import { FormGroup, FormControl, ReactiveFormsModule } from "@angular/forms";
import { FormSaverDirective, AttachHandle } from "ng-form-saver";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [ReactiveFormsModule, FormSaverDirective],
  templateUrl: "./checkout.component.html",
})
export class CheckoutComponent {
  checkoutForm = new FormGroup({
    cardNumber: new FormControl(""),
    expiry: new FormControl(""),
    cvv: new FormControl(""),
  });

  private handle?: AttachHandle;

  onHandleReady(handle: AttachHandle): void {
    this.handle = handle;
    console.log("Form saver attached with key:", handle.key);
  }

  saveNow(): void {
    if (this.handle) {
      this.handle.save(); // Immediately persist to storage
      console.log("Form saved!");
    }
  }

  clearSaved(): void {
    this.handle?.clear(); // Remove from storage
  }
}
```

### AttachHandle Methods

The `AttachHandle` object provides these methods:

| Method      | Description                                       |
| ----------- | ------------------------------------------------- |
| `save()`    | Immediately persist current form state to storage |
| `clear()`   | Remove saved data from storage                    |
| `destroy()` | Stop auto-saving and clean up subscriptions       |

| Property  | Description                               |
| --------- | ----------------------------------------- |
| `key`     | The resolved storage key                  |
| `control` | Reference to the attached AbstractControl |

## Programmatic API — FormSaverService

You can attach programmatically to an `AbstractControl` (FormGroup, FormArray or FormControl) using `FormSaverService.attach`.

```ts
import { Component, OnDestroy } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { FormSaverService, AttachHandle } from "ng-form-saver";

@Component({
  selector: "app-checkout",
  standalone: true,
  template: `...`,
})
export class CheckoutComponent implements OnDestroy {
  form = new FormGroup({
    items: new FormControl([]),
    coupon: new FormControl(""),
  });

  private handle: AttachHandle;

  constructor(private saver: FormSaverService) {
    this.handle = this.saver.attach(this.form, {
      key: "checkout",
      debounceTime: 200,
    });
  }

  // On-demand save
  saveProgress(): void {
    this.handle.save();
  }

  // Clear saved data
  clearCart(): void {
    this.handle.clear();
  }

  ngOnDestroy(): void {
    this.handle.destroy();
  }
}
```

### AttachHandle (returned from attach):

| Property/Method | Type              | Description                                         |
| --------------- | ----------------- | --------------------------------------------------- |
| `key`           | `string`          | Resolved storage key                                |
| `control`       | `AbstractControl` | The control attached                                |
| `save()`        | `() => void`      | **On-demand save** — immediately persist form state |
| `clear()`       | `() => void`      | Remove saved payload from storage                   |
| `destroy()`     | `() => void`      | Unsubscribe from valueChanges and stop persisting   |

## Options (FormSaverOptions)

| Property        | Type                   | Default                                | Description                                                                                                                             |
| --------------- | ---------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `key`           | `string`               | —                                      | Storage key. If omitted and `autoKey` is true, key is derived from current route (requires Router). Otherwise defaults to 'form-saver'. |
| `autoKey`       | `boolean`              | `false`                                | Derive key from current route URL (requires Router in DI).                                                                              |
| `debounceTime`  | `number`               | `300`                                  | Debounce ms for valueChanges persistence.                                                                                               |
| `version`       | `number`               | —                                      | Optional version identifier for saved payload. Works with migrations.                                                                   |
| `migrations`    | `FormSaverMigration[]` | `[]`                                   | Array of migrations to bring old payloads forward.                                                                                      |
| `clearOnSubmit` | `boolean`              | `false`                                | When true, the directive will clear the saved payload on ngSubmit.                                                                      |
| `storage`       | `StorageLike`          | `localStorage` (fallback to in-memory) | Custom storage backend implementing getItem/setItem/removeItem.                                                                         |
| `ttl`           | `number`               | —                                      | Time to live in milliseconds. If set, saved data will automatically expire after this duration.                                         |

### Complete Options Example

```typescript
import { FormSaverOptions, FormSaverMigration } from "ng-form-saver";

const migrations: FormSaverMigration[] = [{ from: 1, to: 2, migrate: (data) => ({ ...data, updatedAt: Date.now() }) }];

const options: FormSaverOptions = {
  key: "user-profile",
  debounceTime: 500,
  version: 2,
  migrations,
  clearOnSubmit: true,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  storage: localStorage,
};
```

### Default provider

The library exposes an injection token `FORM_SAVER_DEFAULT_OPTIONS` with defaults. Use `provideFormSaver(defaults)` to configure defaults for your app:

```ts
import { provideFormSaver } from "ng-form-saver";

bootstrapApplication(App, {
  providers: [provideFormSaver({ debounceTime: 500, clearOnSubmit: true })],
});
```

This will change behavior of the directive and programmatic attach when a specific value isn't provided.

## Migrations (versioned payloads)

Saved payloads include an optional `v` field (version). To migrate older payloads to a new shape, pass `migrations` to options or via default provider. Each migration has `from`, `to`, and `migrate(data)`.

Example migration:

```ts
const migrations = [{ from: 1, to: 2, migrate: (data) => ({ ...data, createdAt: Date.now() }) }];

this.saver.attach(this.form, { key: "profile", version: 2, migrations });
```

When a saved payload with `v = 1` is found, the code above will apply the migrate function and set `v` to `2`.

## TTL (Time to Live)

You can set an optional `ttl` (in milliseconds) to automatically expire saved form data after a certain duration. When the data expires, it will be cleared on the next restore attempt and the form will not be populated with stale data.

### Template example with TTL:

```html
<!-- Form data expires after 1 hour (3600000 ms) -->
<form [formGroup]="form" [formSaver]="{ key: 'checkout', ttl: 3600000 }">
  <input formControlName="cardNumber" />
  <input formControlName="expiry" />
  <button type="submit">Pay</button>
</form>
```

### Programmatic example with TTL:

```ts
// Form data expires after 30 minutes
const handle = this.saver.attach(this.form, {
  key: "sensitive-form",
  ttl: 30 * 60 * 1000, // 30 minutes in milliseconds
});
```

### Common TTL values:

| Duration   | Milliseconds                          |
| ---------- | ------------------------------------- |
| 5 minutes  | `5 * 60 * 1000` (300000)              |
| 30 minutes | `30 * 60 * 1000` (1800000)            |
| 1 hour     | `60 * 60 * 1000` (3600000)            |
| 24 hours   | `24 * 60 * 60 * 1000` (86400000)      |
| 7 days     | `7 * 24 * 60 * 60 * 1000` (604800000) |

**Note:** Expiration is checked only when restoring data. If the user has the form open continuously, the data will continue to be saved. The TTL resets on each save.

## Custom storage

If you need to persist to a server or to `sessionStorage` or a cookie-backed storage, implement the `StorageLike` interface and pass it via options.

### StorageLike Interface

```typescript
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

### sessionStorage Example

```typescript
// Use sessionStorage instead of localStorage
this.saver.attach(this.form, {
  key: "session-form",
  storage: sessionStorage,
});
```

### Custom API Storage Example

```typescript
import { StorageLike } from "ng-form-saver";

class ApiStorage implements StorageLike {
  private cache = new Map<string, string>();

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    // Async save to API
    fetch("/api/form-state", {
      method: "POST",
      body: JSON.stringify({ key, value }),
      headers: { "Content-Type": "application/json" },
    });
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    fetch(`/api/form-state/${key}`, { method: "DELETE" });
  }
}

// Usage
const apiStorage = new ApiStorage();
this.saver.attach(this.form, { key: "synced-form", storage: apiStorage });
```

### IndexedDB Wrapper Example

```typescript
import { StorageLike } from "ng-form-saver";

class IndexedDBStorage implements StorageLike {
  private cache = new Map<string, string>();

  constructor() {
    // Load from IndexedDB on init
    this.loadFromDB();
  }

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    this.saveToDB(key, value);
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    this.deleteFromDB(key);
  }

  private async loadFromDB(): Promise<void> {
    // IndexedDB implementation...
  }

  private async saveToDB(key: string, value: string): Promise<void> {
    // IndexedDB implementation...
  }

  private async deleteFromDB(key: string): Promise<void> {
    // IndexedDB implementation...
  }
}
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
import { bootstrapApplication, BootstrapContext } from "@angular/platform-browser";
import { App } from "./app/app";
import { config } from "./app/app.config.server";

const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);
export default bootstrap;
```

Also remember `localStorage` is not available on the server — the library falls back to an in-memory Map storage automatically.

## API Reference (exports)

### Directive

| Export               | Selector      | Description                                      |
| -------------------- | ------------- | ------------------------------------------------ |
| `FormSaverDirective` | `[formSaver]` | Attach to a `<form>` element to enable auto-save |

**Inputs:**

| Input       | Type                                             | Description                                           |
| ----------- | ------------------------------------------------ | ----------------------------------------------------- |
| `formSaver` | `string \| Partial<FormSaverOptions> \| boolean` | Configuration: string key, options object, or boolean |

**Outputs:**

| Output            | Type                         | Description                                             |
| ----------------- | ---------------------------- | ------------------------------------------------------- |
| `formSaverHandle` | `EventEmitter<AttachHandle>` | Emits the handle after attach for on-demand save access |

### Service

| Export             | Description                             |
| ------------------ | --------------------------------------- |
| `FormSaverService` | Injectable service for programmatic API |

**Methods:**

| Method   | Signature                                                                             | Description                                    |
| -------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `attach` | `attach(control: AbstractControl, options?: Partial<FormSaverOptions>): AttachHandle` | Attach to a form control and start auto-saving |

### Providers

| Export                       | Description                                  |
| ---------------------------- | -------------------------------------------- |
| `provideFormSaver(defaults)` | Provider factory to register default options |
| `FORM_SAVER_DEFAULT_OPTIONS` | Injection token for default configuration    |

### Types

| Type                 | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `FormSaverOptions`   | Configuration options interface                             |
| `FormSaverMigration` | Migration definition for versioned payloads                 |
| `StorageLike`        | Interface for custom storage backends                       |
| `AttachHandle`       | Handle returned from attach with save/clear/destroy methods |

### Complete Import Example

```typescript
import { FormSaverDirective, FormSaverService, provideFormSaver, FORM_SAVER_DEFAULT_OPTIONS, FormSaverOptions, FormSaverMigration, StorageLike, AttachHandle } from "ng-form-saver";
```

## Troubleshooting

### Common Errors

| Error                                   | Cause                                                   | Solution                                                          |
| --------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| `[formSaver] must be used on a form...` | Directive is on an element without Angular form binding | Ensure the element has `[formGroup]` or `ngForm` directive        |
| `NG040 Missing Platform on server`      | SSR bootstrap issue                                     | Pass `BootstrapContext` to `bootstrapApplication` (see SSR notes) |
| `Key 'form-saver' collision`            | Multiple forms using default key                        | Provide unique `key` for each form                                |

### FAQ

**Q: Why isn't my form restoring saved data?**

- Check that the storage key matches
- Verify TTL hasn't expired
- Check browser dev tools → Application → Local Storage

**Q: How do I debug what's being saved?**

```typescript
// Check localStorage directly
const saved = localStorage.getItem("your-form-key");
console.log(JSON.parse(saved));
```

**Q: Can I use this with FormArray?**
Yes! The library works with any `AbstractControl` including `FormArray`.

**Q: How do I prevent saving sensitive fields?**
Consider using a custom storage that filters sensitive data, or split your form.

## Demo and examples

This repository includes a small demo application under `src/` which mounts a demo route at `/demo`. The demo shows:

- Reactive form with directive usage
- On-demand save button using `formSaverHandle`
- Programmatic example using the service
- Clear saved data functionality

Run the demo locally:

```bash
npm start
# browse http://localhost:4200/demo
```

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow**: Runs on every push/PR to main - builds and tests the library
- **Release Workflow**: Triggered by version tags (`v*`) - builds, tests, and publishes to npm

### Publishing a New Version

1. Update version in `projects/ng-form-saver/package.json`
2. Commit changes: `git commit -am "chore: bump version to x.y.z"`
3. Create and push tag: `git tag v1.4.0 && git push origin v1.4.0`
4. GitHub Actions will automatically publish to npm

### Manual Publish

You can also trigger a release manually from the Actions tab with optional dry-run mode.

## Contributing

Contributions, bug reports and PRs are welcome. Please follow the standard Angular library conventions and add tests for new behavior.

## License

MIT
