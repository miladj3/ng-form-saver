import { ENVIRONMENT_INITIALIZER, Provider, inject } from '@angular/core';
import { FORM_SAVER_DEFAULT_OPTIONS } from './form-saver.tokens';
import { FormSaverOptions } from './form-saver.types';

export function provideFormSaver(defaults: Partial<FormSaverOptions> = {}): Provider[] {
  return [
    { provide: FORM_SAVER_DEFAULT_OPTIONS, useValue: defaults },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        // no-op initializer to ensure providers are registered in standalone bootstrap
        inject(FORM_SAVER_DEFAULT_OPTIONS);
      }
    }
  ];
}
