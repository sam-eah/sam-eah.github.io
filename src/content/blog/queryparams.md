---
title: 'In defense of Query Params'
description: ''
pubDate: 'Jul 15 2023'
heroImage: '/90s_pc.png'
---

It's always interesting to notice how web applications often don't make the most of using website addresses (URLs) to show what's happening on a page. In my opinion, URLs should be the go-to way to keep track of what's going on. They can be saved, shared, and easily moved through by using the browser's back and forward buttons.

Even though there are other ways like local storage, session storage, or cookies to store information, they don't let you smoothly go back to a previous state using the browser history or easily share the state through a URL. These options work better for things that don't change much between visits, except for session storage, which might not always be very useful.

It's important to think about adding a state parameter to the URL unless it doesn't really add much value. For example, the state of things like drawers, menus, or accordions might not need to be saved all the time. A good way to decide is to think about whether someone else, when they open the URL you shared, will see the page exactly how you intended, assuming they have the right permissions.

One thing to note is that modal dialogs (those pop-up boxes) are usually something you'd want to show when sharing a URL. But many applications keep track of their states in a way that doesn't make them very flexible.

Here is a Nuxt/Vue composable I wrote to exploit query params easily.

```ts
import { LocationQueryValue } from '.nuxt/vue-router';

interface UseQueryParamsOptions {
  defaultValue?: LocationQueryValue | LocationQueryValue[];
}

export function useQueryParams(name: string, options?: UseQueryParamsOptions) {
  const defaultValue: LocationQueryValue | LocationQueryValue[] =
    options?.defaultValue ?? '';

  const route = useRoute();
  const qp = ref(route.query[name] ?? defaultValue);

  watch([qp], () => {
    if (qp.value === route.query[name]) return;
    navigateTo({
      path: route.path,
      query: {
        ...route.query,
        [name]: qp.value === defaultValue ? undefined : qp.value,
      },
    });
  });

  return qp;
}

export function useBoolQueryParams(name: string) {
  const route = useRoute();
  const qp = ref<boolean>(!!route.query[name]);

  watch([qp], () => {
    navigateTo({
      path: route.path,
      query: {
        ...route.query,
        [name]: qp.value ? 'true' : undefined,
      },
    });
  });

  return qp;
}
```

As you can see, it was relatively simple to implement. When the query search param changes, the ref will automatically be updated,  
and when the ref is changed, the query search param will be updated.  
(Circullar references have been taken care of). Now let's see how we can use it in our applications:

## How to use

Basic usage:

```vue
<template>
  <input type="text" v-model="q" />
</template>

<script setup>
const q = useQueryParams('q');
</script>
```

## Default value

By default, query params will not be shown in url when it's value is empty string.

```
/         <=> q.value = ''
/?q=test  <=> q.value = 'test'
```

It is possible to change this default value through the options.

Example:

```vue
<template>
  <select v-model="searchIn">
    <option value="title">title</option>
    <option value="author">author</option>
    <option value="category">category</option>
  </select>
</template>

<script setup>
const searchIn = useQueryParams('in', { defaultValue: 'title' });
</script>
```

```
/          <=> searchIn.value = 'title'
/?in=test  <=> searchIn.value = 'test'
```

Example 2:

```vue
<template>
  <div>
    <label>
      <input type="radio" v-model="searchIn" value="title" />
      title
    </label>
    <label>
      <input type="radio" v-model="searchIn" value="author" />
      author
    </label>
    <label>
      <input type="radio" v-model="searchIn" value="category" />
      category
    </label>
  </div>
</template>

<script setup>
const searchIn = useQueryParams('in', { defaultValue: 'title' });
</script>
```

## Boolean query params

Example:

```vue
<template>
  <input type="checkbox" v-model="status" />
</template>

<script setup>
const status = useBoolQueryParams('status');
</script>
```

```
/              <=> searchIn.value = false
/?status=true  <=> searchIn.value = true
```

## Array query params

Example:

```vue
<template>
  <select v-model="searchIn" multiple>
    <option value="title">title</option>
    <option value="author">author</option>
    <option value="category">category</option>
  </select>
</template>

<script setup>
const searchIn = useQueryParams('in');
</script>
```

```
/                     <=> searchIn.value = []
/?in=title            <=> searchIn.value = ['title']
/?in=title&in=author  <=> searchIn.value = ['title', 'author']
```

Repo here: [Nuxt Query Params Composable](https://github.com/sam-eah/nuxt-query-params).
