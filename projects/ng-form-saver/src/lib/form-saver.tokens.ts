import { InjectionToken } from '@angular/core';
import { FormSaverOptions } from './form-saver.types';

export const FORM_SAVER_DEFAULT_OPTIONS = new InjectionToken<Partial<FormSaverOptions>>(
  'FORM_SAVER_DEFAULT_OPTIONS',
  { factory: () => ({ debounceTime: 300, autoKey: false, clearOnSubmit: false }) }
);
