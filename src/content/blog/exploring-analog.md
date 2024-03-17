---
title: 'Exploring Analog JS'
description: ''
pubDate: 'Nov 30 2022'
heroImage: '/analog.JPG'
---

Set up

```sh
npm create analog@latest
# add tanstack query
npm i @ngneat/query
```

`server/routes/hello.ts`

```ts
import { defineEventHandler } from 'h3';

export default defineEventHandler(() => ({ message: 'Hello World' }));
```

`app/services/messages.service.ts`

```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UseQuery } from '@ngneat/query';

@Injectable({ providedIn: 'root' })
export class TodosService {
  private http = inject(HttpClient);
  private useQuery = inject(UseQuery);

  getMessage() {
    return this.useQuery(
      ['message'], 
      () => this.http.get<{ message: string }>('/api/hello')
    );
  }
}
```

Component

`app/components/main.component.ts`

```ts
import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TodosService } from '../services/messages.service';

@Component({
  selector: 'main-component',
  standalone: true,
  imports: [NgIf, AsyncPipe],
  templateUrl: `
<div>
  <ng-container *ngIf="message$ | async as message">
    {{ message.data?.message }}
  </ng-container>
</div>
`,
  styles: [],
})
export class MainComponent {
  private todosService = inject(TodosService);
  message$ = this.todosService.getMessage().result$;
}
```
