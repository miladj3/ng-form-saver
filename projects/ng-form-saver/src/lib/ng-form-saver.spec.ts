import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgFormSaver } from './ng-form-saver';

describe('NgFormSaver', () => {
  let component: NgFormSaver;
  let fixture: ComponentFixture<NgFormSaver>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgFormSaver]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgFormSaver);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
