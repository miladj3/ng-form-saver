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

      <form [formGroup]="form" [formSaver]="formOptions" (ngSubmit)="onSubmit()">
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
      <p class="ttl-info">TTL: 1 minute — data expires at: {{ expiresAtFormatted }}</p>
      <pre>{{ savedPayload }}</pre>
    </section>
  `,
  styles: [`.demo { max-width:520px; padding:1rem } label { display:block; margin-top:8px } input { width:100%; padding:6px; } pre { background:#f5f5f5; padding:8px } .ttl-info { font-size:0.9em; color:#666; margin:4px 0 }`]
})
export class FormDemoComponent implements OnDestroy {
  readonly demoKey = 'demo-form';

  // TTL set to 1 minute (60,000 ms), explicitly using localStorage
  readonly formOptions = { key: 'demo-form', ttl: 1 * 60 * 1000, storage: 'sessionStorage' as const };

  form = new FormGroup({
    name: new FormControl(''),
    email: new FormControl('')
  });

  savedPayload: string | null = null;
  expiresAtFormatted: string = '—';
  private sub = new Subscription();

  constructor(private saver: FormSaverService) {
    // update preview on changes
    this.updateSavedDisplay();
    this.sub.add(this.form.valueChanges.subscribe(() => this.updateSavedDisplay()));
  }

  private updateSavedDisplay(): void {
    this.savedPayload = this.readSaved();
    this.expiresAtFormatted = this.getExpiresAt();
  }

  private readSaved(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(this.demoKey) : null;
    } catch {
      return null;
    }
  }

  private getExpiresAt(): string {
    try {
      const raw = this.readSaved();
      if (!raw) return '—';
      const parsed = JSON.parse(raw);
      if (parsed.expiresAt) {
        return new Date(parsed.expiresAt).toLocaleTimeString();
      }
      return '—';
    } catch {
      return '—';
    }
  }

  clearSaved() {
    this.saver.clear(this.demoKey);
    this.updateSavedDisplay();
    this.form.reset();
  }

  onSubmit() {
    this.updateSavedDisplay();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
