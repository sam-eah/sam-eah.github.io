---
title: 'Nuxt cookie auth'
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

`server/utils/auth.ts`

```ts
import { User } from '@prisma/client';

export const useSessions = () => useStorage<User>();

export function getUser(event: H3Event) {
  const sessions = useSessions();
  const sessionId = getCookie(event, 'sessionId');
  if (!sessionId)
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be connected',
    });

  const user = sessions.getItem(sessionId);
  if (!user)
    throw createError({
      statusCode: 401,
      statusMessage: 'User session not found',
    });
}

```

`server/api/auth/login.post.ts`

```ts
import { prisma } from '../../../prisma/db';
import { z } from 'zod';

const bodySchema = z.object({
  email: z.string().email(),
  // password: z.string(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse);
  const sessions = useSessions();

  const user = await prisma.user
    .findFirst({
      where: {
        email: parsedBody.email,
      },
    })
    .catch((error) => {
      throw createError('An error occured with the database');
    });

  if (!user) throw createError('User not found');

  const sessionId = crypto.randomUUID();
  sessions.setItem(sessionId, user);
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
export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'sessionId');
  const sessions = useSessions();

  if (!sessionId)
    throw createError('Session id not found');

  sessions.removeItem(sessionId);
  deleteCookie(event, sessionId);

  setResponseStatus(event, 204);
  return {};
});
```

`server/api/auth/me.ts`

```ts
export default defineEventHandler(async (event) => {
  const user = getUser(event);
  return user;
});
```

## Composables

`composables/useAuth.ts`

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) =>
      $fetch("/api/auth/login", {
        method: "post",
        body: { email },
      }),
    onSuccess(data) {
      queryClient.setQueryData(["me"], data);
    },
    onError(error, variables, context) {
      alert(error)
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => $fetch("/api/auth/logout", { method: "delete" }),
    onSuccess() {
      console.log("success")
      queryClient.invalidateQueries({queryKey: ["me"]})
    },
    onError(error, variables, context) {
      alert(error)
    },
  });
}

export const useMe = () => useQuery({
  queryKey: ["me"],
  queryFn: () => $fetch("/api/auth/me"),
  retry: false
});

```

## Components

`components/LoginForm.vue`

```vue
<template>
  <div v-if="me.isPending.value">Loading...</div>
  <form v-else-if="me.error.value" @submit.prevent="login.mutate(email)">
    <input v-model="email" />
    <button type="submit" :disabled="login.isPending.value">
      Login
    </button>
  </form>
  <div v-else-if="me.data.value">
    {{ me.data.value?.email }}
    <button @click="logout.mutate()" :disabled="logout.isPending.value">
      Logout
    </button>
    <button @click="me.refetch()" :disabled="me.isPending.value">
      Try auth
    </button>
  </div>
</template>

<script setup lang="ts">
import { useLogin, useLogout, useMe } from "~/services/auth";

const me = useMe();
const login = useLogin();
const logout = useLogout();

const email = ref("");
</script>

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
          v-if="account?.id"
          v-on:click="() => updateBook?.(book.id, account.id)">
          Rent the book
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookWithRelations } from '../prisma/types';

const me = useMe();
const account = computed(() => me.data.value)

defineProps<{
  data?: BookWithRelations[] | null;
  updateBook?: (id: number, accountId: number | null) => void;
}>();
</script>
```
