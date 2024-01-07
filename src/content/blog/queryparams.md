---
title: 'In defense of Query Params'
description: ''
pubDate: 'Jul 15 2023'
heroImage: '/90s_pc.png'
---

It is consistently intriguing to observe the limited utilization of URLs in describing the state within web applications. Despite the fact that, in my perspective, URLs should serve as the default method for state storage. URLs possess the capacity to be stored, shared, and navigated through browser history using back and forward functionalities.

While alternative approaches such as local storage, session storage, or cookies exist for state storage, they lack the capability to seamlessly revert to a previous state through browser history or facilitate state sharing via URL sharing. These alternatives are better suited for relatively static states that are likely to persist between sessions, with the exception of session storage, which may not always prove particularly advantageous.

It is imperative to consider incorporating a state parameter via URL unless there is a negligible value addition. For instance, the state of elements like drawers, menus, or accordions may not necessarily require persistent storage. A practical approach to evaluate this is to contemplate whether, when sharing the page as a URL, the recipient will observe the intended state, assuming proper authentication if required.

Notably, modal dialogs are typically elements one would prefer to be visible when shared, making them suitable candidates for URL-based state representation. However, many applications tend to store their states within variables, diminishing their overall versatility.

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
    if (qp.value !== route.query[name]) {
      const query = {
        ...route.query,
        [name]: qp.value === defaultValue ? undefined : qp.value,
      };
      navigateTo({
        path: route.path,
        query,
      });
    }
  });

  return qp;
}

export function useBoolQueryParams(name: string) {
  const route = useRoute();
  const qp = ref<boolean>(!!route.query[name]);

  watch([qp], () => {
    const query = {
      ...route.query,
      [name]: qp.value ? 'true' : undefined,
    };
    navigateTo({
      path: route.path,
      query,
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
