import { AbstractControl } from '@angular/forms';

export interface StorageLike {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface FormSaverMigration {
  from: number | string;
  to: number | string;
  migrate: (data: any) => any;
}

export interface FormSaverOptions {
  key?: string;
  autoKey?: boolean; // if true, derive from current route URL
  debounceTime?: number; // ms
  version?: number | string; // schema version
  migrations?: FormSaverMigration[];
  clearOnSubmit?: boolean;
  storage?: StorageLike | 'localStorage' | 'sessionStorage'; // default localStorage
}

export interface AttachHandle {
  key: string;
  destroy: () => void;
  clear: () => void;
  save: () => void;
  control: AbstractControl;
}
