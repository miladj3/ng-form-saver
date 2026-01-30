import { Directive, EventEmitter, HostListener, Input, OnDestroy, OnInit, Optional, Output, inject } from '@angular/core';
import { FormGroupDirective, NgForm } from '@angular/forms';
import { FORM_SAVER_DEFAULT_OPTIONS } from './form-saver.tokens';
import { FormSaverService } from './form-saver.service';
import { AttachHandle, FormSaverOptions } from './form-saver.types';

@Directive({
  selector: '[formSaver]',
  standalone: true
})
export class FormSaverDirective implements OnInit, OnDestroy {
  @Input('formSaver') formSaverInput?: string | Partial<FormSaverOptions> | '' | true | false;

  /** Emits the AttachHandle after the form is attached, enabling on-demand save via handle.save() */
  @Output() formSaverHandle = new EventEmitter<AttachHandle>();

  private readonly defaults = inject(FORM_SAVER_DEFAULT_OPTIONS, { optional: true }) || {};
  private handle?: AttachHandle;

  constructor(
    private readonly saver: FormSaverService,
    @Optional() private readonly ngForm?: NgForm,
    @Optional() private readonly formGroupDirective?: FormGroupDirective
  ) { }

  ngOnInit(): void {
    const control = this.formGroupDirective?.control ?? this.ngForm?.form;
    if (!control) {
      throw new Error('[formSaver] must be used on a form with ReactiveFormsModule or FormsModule');
    }

    const merged = this.mergeOptions(this.formSaverInput);
    this.handle = this.saver.attach(control, merged);
    this.formSaverHandle.emit(this.handle);
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
