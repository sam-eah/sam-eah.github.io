---
title: 'Nuxt DB search and pagination'
description: ''
pubDate: 'Jul 15 2023'
heroImage: '/books.png'
---

How to query the DB from the front, through the server, using query params, and paginated response?

We'll use this prisma schema:

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Book {
  id             Int      @id @default(autoincrement())
  title          String
  author         Author   @relation(fields: [authorId], references: [id])
  authorId       Int
  category       Category @relation(fields: [categoryId], references: [id])
  categoryId     Int
  currentOwner   User?    @relation(fields: [currentOwnerId], references: [id])
  currentOwnerId Int?
}

model User {
  id          Int    @id @default(autoincrement())
  email       String
  rentedBooks Book[]
}

model Author {
  id    Int    @id @default(autoincrement())
  name  String
  books Book[]
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String
  books Book[]
}
```

We're using SQLite in this tutorial for simplicity.

We'll need some prisma composed types later, in `prisma/types.ts`:

```ts
import { Prisma } from '@prisma/client';

export type BookWithRelations = Prisma.BookGetPayload<{
  include: { author: true; category: true };
}>;
```

## Server

server/api/book/index.get.ts

```ts
import { prisma } from '../../../prisma/db';

const ITEMS_PER_PAGE = 2;

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = query.q as string | undefined;
  const status = query.status as 'true' | undefined;
  const searchIn = query.in as 'author' | 'category' | undefined;
  const currentPage = query.page ? +query.page : 1;

  const where = {
    ...(status === 'true' && { currentOwnerId: null }),
    ...(q &&
      (searchIn === 'author'
        ? { author: { name: { contains: q } } }
        : searchIn === 'category'
        ? { category: { name: { contains: q } } }
        : { title: { contains: q } })),
  };

  const [data, count] = await prisma
    .$transaction([
      prisma.book.findMany({
        where,
        include: {
          author: true,
          category: true,
        },
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      }),
      prisma.book.count({ where }),
    ])
    .catch((error) => {
      throw createError({
        statusCode: 400,
        statusMessage: 'An error occured with the database',
      });
    });

  const totalPage = Math.ceil(count / ITEMS_PER_PAGE);

  return {
    data,
    currentPage,
    totalPage,
  };
});
```

## UI

We're using the `useQueryParams` composable already explored.

```ts
<template>
  <div>
    <h1>Books</h1>
    <form>
      <input type="text" v-model="q" />
      <button
        v-on:click="
          () => {
            q = '';
          }
        ">
        X
      </button>
      <label>
        only search available
        <input type="checkbox" v-model="status" />
      </label>
      <select v-model="searchIn">
        <option value="title">title</option>
        <option value="author">author</option>
        <option value="category">category</option>
      </select>
    </form>
    <div v-if="pending">loading...</div>
    <div v-else>
      <Books :data="data?.data" :update-book="updateBook" />
      <Pagination v-model="page" :total-page="data?.totalPage" />
      <!-- <Pagination model-value="1" :total-page="2" /> -->
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

const q = useQueryParams('q');
const status = useBoolQueryParams('status');
const searchIn = useQueryParams('in', { defaultValue: 'title' });
const page = useQueryParams('page', { defaultValue: '1' });

const params = computed(() => route.query);
const debounced = refDebounced(params, 200);

const { data, refresh, pending } = await useFetch('/api/book', {
  key: JSON.stringify(debounced),
  params: debounced,
});

const updateBook = async (id: number, currentOwnerId: number | null) => {
  const { error } = await useFetch(`/api/book/${id}`, {
    method: 'put',
    body: {
      currentOwnerId,
    },
  });
  if (error.value) {
    alert(error.value.data.message);
    return;
  }
  refresh();
};
</script>
```
