import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FormSaverDirective, FormSaverService } from '../../../projects/ng-form-saver/src/public-api';

@Component({
  selector: 'app-form-demo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormSaverDirective],
  template: `
    <section class="demo">
      <h2>ng-form-saver demo</h2>

      <form [formGroup]="form" [formSaver]="demoKey" (ngSubmit)="onSubmit()">
        <div>
          <label for="name">Name</label>
          <input id="name" type="text" formControlName="name" />
        </div>

        <div>
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" />
        </div>

        <div style="margin-top:12px">
          <button type="submit">Submit</button>
          <button type="button" (click)="clearSaved()">Clear saved</button>
        </div>
      </form>

      <h3>Saved payload (localStorage key: {{ demoKey }})</h3>
      <pre>{{ savedPayload }}</pre>
    </section>
  `,
  styles: [`.demo { max-width:520px; padding:1rem } label { display:block; margin-top:8px } input { width:100%; padding:6px; } pre { background:#f5f5f5; padding:8px }`]
})
export class FormDemoComponent implements OnDestroy {
  readonly demoKey = 'demo-form';

  form = new FormGroup({
    name: new FormControl(''),
    email: new FormControl('')
  });

  savedPayload: string | null = null;
  private sub = new Subscription();

  constructor(private saver: FormSaverService) {
    // update preview on changes
    this.savedPayload = this.readSaved();
    this.sub.add(this.form.valueChanges.subscribe(() => (this.savedPayload = this.readSaved())));
  }

  private readSaved(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(this.demoKey) : null;
    } catch {
      return null;
    }
  }

  clearSaved() {
    this.saver.clear(this.demoKey);
    this.savedPayload = this.readSaved();
    this.form.reset();
  }

  onSubmit() {
    this.savedPayload = this.readSaved();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
