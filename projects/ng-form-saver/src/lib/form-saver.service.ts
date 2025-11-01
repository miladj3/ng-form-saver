import { Injectable, Optional, inject } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, startWith, Subscription } from 'rxjs';
import { FORM_SAVER_DEFAULT_OPTIONS } from './form-saver.tokens';
import { AttachHandle, FormSaverMigration, FormSaverOptions, StorageLike } from './form-saver.types';

interface StoredPayload {
  v?: number | string;
  data: any;
  meta?: Record<string, { dirty: boolean; touched: boolean }>;
}

@Injectable({ providedIn: 'root' })
export class FormSaverService {
  private readonly defaults = inject(FORM_SAVER_DEFAULT_OPTIONS, { optional: true }) || {};
  constructor(@Optional() private router?: Router) {}

  attach(control: AbstractControl, options: Partial<FormSaverOptions> = {}): AttachHandle {
    const opts = { debounceTime: 300, ...this.defaults, ...options } as FormSaverOptions;
    const storage = this.getStorage(opts.storage);
    const key = this.resolveKey(opts);

    // Try restore on attach
    const restored = this.tryRestore(control, storage, key, opts);
    if (restored) {
      // noop
    }

    const sub = new Subscription();
    const valueChanges = control.valueChanges.pipe(startWith(control.value), debounceTime(opts.debounceTime ?? 300));

    sub.add(
      valueChanges.subscribe(() => {
        const payload = this.buildPayload(control, opts);
        try {
          storage.setItem(key, JSON.stringify(payload));
        } catch {
          // ignore quota or serialization errors
        }
      })
    );

    const handle: AttachHandle = {
      key,
      control,
      destroy: () => sub.unsubscribe(),
      clear: () => this.clear(key, storage)
    };

    return handle;
  }

  clear(key: string, storage?: StorageLike): void {
    (storage ?? this.getStorage()).removeItem(key);
  }

  private getStorage(custom?: StorageLike): StorageLike {
    if (custom) return custom;
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch {
      // SSR or restricted env
    }
    // Fallback in-memory storage per-session
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k)
    } as StorageLike;
  }

  private resolveKey(opts: FormSaverOptions): string {
    if (opts.key) return opts.key;
    if (opts.autoKey && this.router) {
      const url = this.router.url || '/';
      return `form:${url}`;
    }
    return 'form-saver';
  }

  private tryRestore(control: AbstractControl, storage: StorageLike, key: string, opts: FormSaverOptions): boolean {
    const raw = storage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as StoredPayload;
      const migrated = this.applyMigrations(parsed, opts.version, opts.migrations ?? []);
      this.patchControl(control, migrated.data);
      if (migrated.meta) this.applyMeta(control, migrated.meta);
      return true;
    } catch {
      return false;
    }
  }

  private buildPayload(control: AbstractControl, opts: FormSaverOptions): StoredPayload {
    const data = control.value;
    const meta = this.collectMeta(control);
    const payload: StoredPayload = { v: opts.version, data, meta };
    return payload;
  }

  private applyMigrations(payload: StoredPayload, targetVersion: number | string | undefined, mgs: FormSaverMigration[]): StoredPayload {
    if (targetVersion == null) return payload;
    let current = payload.v ?? 0;
    // naive forward-migration by matching `from` sequentially
    let guard = 0;
    while (current !== targetVersion && guard++ < 50) {
      const mig = mgs.find((m) => m.from === current);
      if (!mig) break;
      payload.data = mig.migrate(payload.data);
      current = mig.to;
      payload.v = current;
    }
    return payload;
  }

  private patchControl(ctrl: AbstractControl, value: any) {
    // Use patchValue to be forgiving with shapes
    try {
      (ctrl as any).patchValue?.(value, { emitEvent: false });
    } catch {
      try {
        ctrl.setValue(value, { emitEvent: false } as any);
      } catch {
        // ignore
      }
    }
  }

  private collectMeta(ctrl: AbstractControl, path: string[] = []): Record<string, { dirty: boolean; touched: boolean }> {
    const key = path.join('.') || '$root';
    const out: Record<string, { dirty: boolean; touched: boolean }> = {
      [key]: { dirty: ctrl.dirty, touched: ctrl.touched }
    };
    if (ctrl instanceof FormGroup) {
      Object.entries(ctrl.controls).forEach(([k, c]) => Object.assign(out, this.collectMeta(c, [...path, k])));
    } else if (ctrl instanceof FormArray) {
  ctrl.controls.forEach((c: AbstractControl, i: number) => Object.assign(out, this.collectMeta(c, [...path, String(i)])));
    }
    return out;
  }

  private applyMeta(ctrl: AbstractControl, meta: Record<string, { dirty: boolean; touched: boolean }>, path: string[] = []) {
    const key = path.join('.') || '$root';
    const m = meta[key];
    if (m) {
      if (m.dirty) ctrl.markAsDirty({ onlySelf: true }); else ctrl.markAsPristine({ onlySelf: true });
      if (m.touched) ctrl.markAsTouched({ onlySelf: true }); else ctrl.markAsUntouched({ onlySelf: true });
    }
    if (ctrl instanceof FormGroup) {
      Object.entries(ctrl.controls).forEach(([k, c]) => this.applyMeta(c, meta, [...path, k]));
    } else if (ctrl instanceof FormArray) {
  ctrl.controls.forEach((c: AbstractControl, i: number) => this.applyMeta(c, meta, [...path, String(i)]));
    }
  }
}
