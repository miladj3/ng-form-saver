import { Directive, HostListener, Input, OnDestroy, OnInit, Optional, inject } from '@angular/core';
import { FormGroupDirective, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { FORM_SAVER_DEFAULT_OPTIONS } from './form-saver.tokens';
import { FormSaverService } from './form-saver.service';
import { AttachHandle, FormSaverOptions } from './form-saver.types';

@Directive({
  selector: '[formSaver]',
  standalone: true
})
export class FormSaverDirective implements OnInit, OnDestroy {
  @Input('formSaver') formSaverInput?: string | Partial<FormSaverOptions> | '' | true | false;

  private readonly defaults = inject(FORM_SAVER_DEFAULT_OPTIONS, { optional: true }) || {};
  private handle?: AttachHandle;

  constructor(
    private saver: FormSaverService,
    @Optional() private ngForm?: NgForm,
    @Optional() private formGroupDirective?: FormGroupDirective,
    @Optional() private router?: Router
  ) {}

  ngOnInit(): void {
    const control = this.formGroupDirective?.control ?? this.ngForm?.form;
    if (!control) {
      throw new Error('[formSaver] must be used on a form with ReactiveFormsModule or FormsModule');
    }

    const merged = this.mergeOptions(this.formSaverInput);
    this.handle = this.saver.attach(control, merged);
  }

  ngOnDestroy(): void {
    this.handle?.destroy();
  }

  @HostListener('ngSubmit')
  onSubmit() {
    const merged = this.mergeOptions(this.formSaverInput);
    if (merged.clearOnSubmit && this.handle) {
      this.handle.clear();
    }
  }

  private mergeOptions(input: string | Partial<FormSaverOptions> | '' | true | false | undefined): FormSaverOptions {
    let local: Partial<FormSaverOptions> = {};
    if (typeof input === 'string' && input.trim().length) {
      local.key = input.trim();
    } else if (typeof input === 'object' && input) {
      local = input;
    }
    const out = { debounceTime: 300, ...this.defaults, ...local } as FormSaverOptions;
    // if autoKey requested and no key provided, service will resolve via Router
    return out;
  }
}
