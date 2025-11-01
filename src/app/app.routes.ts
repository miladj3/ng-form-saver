import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', redirectTo: 'demo', pathMatch: 'full' },
	{
		path: 'demo',
		loadComponent: () => import('./demo/form-demo.component').then((m) => m.FormDemoComponent)
	}
];
