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

const useSessions = () => useStorage<User>();
const sessionIdKey = 'sessionId'

export function getUser(event: H3Event) {
  const sessions = useSessions();
  const sessionId = getCookie(event, sessionIdKey);
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

export function setUser(event: H3Event, user: User) {
  const sessions = useSessions();
  const sessionId = crypto.randomUUID();
  sessions.setItem(sessionId, user);
  setCookie(event, sessionIdKey, sessionId, {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
  });
}

export function removeUser(event: H3Event) {
  const sessions = useSessions();
  const sessionId = getCookie(event, sessionIdKey);

  if (!sessionId)
    throw createError('Session id not found');

  sessions.removeItem(sessionId);
  deleteCookie(event, sessionId);

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

  const user = await prisma.user
    .findFirst({
      where: {
        email: body.email,
      },
    })
    .catch((error) => {
      throw createError('An error occured with the database');
    });

  if (!user) throw createError('User not found');

  setUser(event, user)

  return user;
});
```

`server/api/auth/logout.delete.ts`

```ts
export default defineEventHandler(async (event) => {
  removeUser(event)

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


## Permissions

This is inspired from webdevsimplified.com

```ts
type Comment = {
  id: string
  body: string
  authorId: string
  createdAt: Date
}

type Todo = {
  id: string
  title: string
  userId: string
  completed: boolean
  invitedUsers: string[]
}

type Role = "admin" | "moderator" | "user"
type User = { blockedBy: string[]; roles: Role[]; id: string }

type PermissionCheck<Key extends keyof Permissions> =
  | boolean
  | ((user: User, data: Permissions[Key]["dataType"]) => boolean)

type RolesWithPermissions = {
  [R in Role]: Partial<{
    [Key in keyof Permissions]: Partial<{
      [Action in Permissions[Key]["action"]]: PermissionCheck<Key>
    }>
  }>
}

type Permissions = {
  comments: {
    dataType: Comment
    action: "view" | "create" | "update"
  }
  todos: {
    // Can do something like Pick<Todo, "userId"> to get just the rows you use
    dataType: Todo
    action: "view" | "create" | "update" | "delete"
  }
}

const ROLES = {
  admin: {
    comments: {
      view: true,
      create: true,
      update: true,
    },
    todos: {
      view: true,
      create: true,
      update: true,
      delete: true,
    },
  },
  moderator: {
    comments: {
      view: true,
      create: true,
      update: true,
    },
    todos: {
      view: true,
      create: true,
      update: true,
      delete: (user, todo) => todo.completed,
    },
  },
  user: {
    comments: {
      view: (user, comment) => !user.blockedBy.includes(comment.authorId),
      create: true,
      update: (user, comment) => comment.authorId === user.id,
    },
    todos: {
      view: (user, todo) => !user.blockedBy.includes(todo.userId),
      create: true,
      update: (user, todo) =>
        todo.userId === user.id || todo.invitedUsers.includes(user.id),
      delete: (user, todo) =>
        (todo.userId === user.id || todo.invitedUsers.includes(user.id)) &&
        todo.completed,
    },
  },
} as const satisfies RolesWithPermissions

export function hasPermission<Resource extends keyof Permissions>(
  user: User,
  resource: Resource,
  action: Permissions[Resource]["action"],
  data?: Permissions[Resource]["dataType"]
) {
  return user.roles.some(role => {
    const permission = (ROLES as RolesWithPermissions)[role][resource]?.[action]
    if (permission == null) return false

    if (typeof permission === "boolean") return permission
    return data != null && permission(user, data)
  })
}

// USAGE:
const user: User = { blockedBy: ["2"], id: "1", roles: ["user"] }
const todo: Todo = {
  completed: false,
  id: "3",
  invitedUsers: [],
  title: "Test Todo",
  userId: "1",
}

// Can create a comment
hasPermission(user, "comments", "create")

// Can view the `todo` Todo
hasPermission(user, "todos", "view", todo)

// Can view all todos
hasPermission(user, "todos", "view")
```
