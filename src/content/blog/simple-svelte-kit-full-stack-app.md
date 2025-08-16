---
title: 'Simple SvelteKit full-stack app'
description: ''
pubDate: 'Jul 03 2023'
heroImage: '/sveltekit.JPG'
---


Let's build a very simple full stack application using the open api https://gorest.co.in/

There will be one page with the list of users with a link to their profile, and a page for each user's profile.

### Setup

Let's initialise the project using:

```bash
# create a new project in the current directory
pnpm create svelte@latest
```

Looking at the responses from the API, we can already create a file for the interfaces we're going to need:

`lib/types.ts`

```ts
export interface TestUser {
	id: number;
	name: string;
	email: string;
	gender: string;
	status: string;
}

export interface TestPagination {
	total: number;
	pages: number;
	page: number;
	limit: number;
	links: any;
}

export interface TestResponse {
	meta: { pagination: TestPagination };
	data: TestUser[];
}
```

We'll use a component to display a user:

`components/user.svelte`

```svelte
<script lang="ts">
	import type { TestUser } from '../lib/types';

	export let user: TestUser;
</script>

<div class="card">
	<a href="/{user.id}">
		<h2 class="name">{user.name}</h2>
		<p class="email">{user.email}</p>
	</a>
</div>

<style>
	a {
		color: inherit; /* blue colors for links too */
		text-decoration: inherit; /* no underline */
	}
	.card {
		padding: 4px 20px;
		background-color: lightcyan;
		margin: 4px 2px;
	}

	.name {
		color: darkblue;
	}

	.email {
		color: darkgray;
	}
</style>
```

For the pages, we'll do the fetching in the backend and server side render them:

`routes/+page.ts`

```ts
import type { TestResponse } from '../lib/types';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const res = await fetch('https://gorest.co.in/public/v1/users');
	const r = (await res.json()) as TestResponse;

	console.log(r.data[1]);
	return r;
}
```

`routes/+page.svelte`

```svelte
<script>
	import User from '../components/user.svelte';

	export let data;
</script>

<section>
	{#each data.data as user}
		<User {user} />
	{/each}
</section>

<style>
	section {
		max-width: 600px;
	}
</style>
```

`routes/[slug]/+page.ts`

```ts
import { error } from '@sveltejs/kit';
import type { TestResponse } from '../../lib/types';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const userId = +params.slug;
	const res = await fetch('https://gorest.co.in/public/v1/users');
	const r = (await res.json()) as TestResponse;

	const user = r.data.find((user) => user.id === userId);

	if (!user) throw error(400, 'Not found');

	return user;
}
```

`routes/[slug]/+page.svelte`

```svelte
<script>
	import User from '../../components/user.svelte';
	export let data;
</script>

<a href="/">Back</a>

<h1>Profile of {data.name}</h1>

<User user={data} />
```