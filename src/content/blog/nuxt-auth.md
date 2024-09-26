---
title: 'Nuxt Cookie Auth'
description: ''
pubDate: 'Jul 15 2023'
heroImage: '/authentication.png'
---

We will use Nuxt3 with prisma ORM to interact with the DB and pinia global store.

Add this model to `schema.prisma`

```prisma
model User {
  id          Int    @id @default(autoincrement())
  email       String
}
```

## Server API

`server/sessions.ts`

```ts
import { User } from '@prisma/client';

export const SESSIONS = new Map<string, User>();
```

`server/api/auth/login.post.ts`

```ts
import { prisma } from '../../../prisma/db';
import { z } from 'zod';
import { SESSIONS } from '../../sessions';

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsedBody = z
    .object({
      email: z.string().email(),
      // password: z.string(),
    })
    .parse(body);

  const user = await prisma.user
    .findFirst({
      where: {
        email: parsedBody.email,
      },
    })
    .catch((error) => {
      throw createError({
        statusCode: 400,
        statusMessage: 'An error occured with the database',
      });
    });

  if (!user)
    throw createError({
      statusCode: 400,
      statusMessage: 'User not found',
    });

  const sessionId = '1111';
  SESSIONS.set(sessionId, user);
  setCookie(event, 'sessionId', sessionId, {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
  });

  return user;
});
```

`server/api/auth/logout.delete.ts`

```ts
import { SESSIONS } from '../../sessions';

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'sessionId');

  if (!sessionId)
    throw createError({
      statusCode: 400,
      statusMessage: 'Session id not found',
    });

  SESSIONS.delete(sessionId);
  deleteCookie(event, sessionId);

  setResponseStatus(event, 204);
  return {};
});
```

`server/api/auth/me.ts`

```ts
import { SESSIONS } from '../../sessions';

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'sessionId');

  if (!sessionId)
    throw createError({
      statusCode: 400,
      statusMessage: 'Session id not found',
    });

  const user = SESSIONS.get(sessionId);

  if (!user)
    throw createError({
      statusCode: 400,
      statusMessage: 'Session expired',
    });

  return user;
});
```

## Store

`store/index.ts`

```ts
import { User } from '@prisma/client';
import { defineStore } from 'pinia';

export const useStore = defineStore('main', {
  state: () => ({
    account: null as User | null,
  }),
  actions: {
    setAccount(account: User | null) {
      this.account = account;
    },
  },
  persist: true,
});
```

## Composables

`composables/useAuth.ts`

```ts
import { useStore } from '../store';

export function useAuth() {
  const store = useStore();

  const authenticate = async () => {
    try {
      const data = await $fetch('/api/auth/me');
      store.setAccount(data.value);
    } catch (error) {
      store.setAccount(null);
    }
  };

  const login = async (email: string) => {
    const data = await $fetch('/api/auth/login', {
      method: 'post',
      body: { email },
    });
    store.setAccount(data.value);
  };

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'delete' });
    store.setAccount(null);
  };

  const account = computed(() => store.account);

  return {
    account,
    authenticate,
    login,
    logout,
  };
}
```

## Components

`components/LoginForm.vue`

```vue
<template>
  <form method="dialog">
    <input type="text" v-model="email" />
    <button
      v-on:click="
        () => {
          login(email).then(() => {
            navigateTo('/');
          });
        }
      ">
      Login
    </button>
  </form>
</template>

<script setup lang="ts">
const { login } = useAuth();
const email = ref('');
</script>
```

## Example endpoint requiring auth

Let's create an endpoint requiring auth, `server/api/test.ts`

```ts
import { prisma } from '../../../prisma/db';
import { z } from 'zod';
import { SESSIONS } from '../../sessions';

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
  const id = +event.context.params!.slug;
  const parsedId = z.number().parse(id);

  const sessionId = getCookie(event, 'sessionId');
  if (!sessionId)
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be connected',
    });

  const user = SESSIONS.get(sessionId);
  if (!user)
    throw createError({
      statusCode: 401,
      statusMessage: 'User session not found',
    });

  // do the work

  return {};
}
```

## Example component using auth

`components/Books.vue`

```vue
<template>
  <div>
    <div v-for="(book, index) in data" :key="book.id">
      {{ book.title }} - {{ book.author.name }} - {{ book.category.name }} -
      <span v-if="account && book.currentOwnerId === account.id">
        You own this book
        <button v-on:click="() => updateBook?.(book.id, null)">
          Return the bookt
        </button>
      </span>
      <span v-else-if="book.currentOwnerId">
        Someone already owns this book
      </span>
      <span v-else>
        No one own this book
        <button
          v-if="account"
          v-on:click="() => updateBook?.(book.id, account!.id)">
          Rent the book
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookWithRelations } from '../prisma/types';

const { account } = useAuth();

defineProps<{
  data?: BookWithRelations[] | null;
  updateBook?: (id: number, accountId: number | null) => void;
}>();
</script>
```
