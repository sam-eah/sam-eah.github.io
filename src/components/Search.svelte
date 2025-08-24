<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import fuzzy from "fuzzy";

  interface Post {
    id: string;
    slug: string;
    body: string;
    collection: string;
    data: {
      title: string;
      description: string;
      pubDate: Date;
      updatedDate?: Date;
      heroImage?: string;
    };
  }

  export let posts: Post[] = [];

  let dialog: HTMLDialogElement;
  let query = "";

  // Declarative search
  $: filteredPosts = query
    ? fuzzy
        .filter(query, posts, { extract: (el: Post) => el.data.title })
        .map((r) => r.original)
    : [];

  function open() {
    dialog?.showModal();
    // Autofocus the input when opened
    const input = dialog?.querySelector<HTMLInputElement>("input");
    input?.focus();
  }

  function close(event: MouseEvent) {
    if (event.target === dialog) dialog.close();
  }

  // Shortcut listener
  function handleKeydown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

    if (ctrlOrCmd && event.key.toLowerCase() === "k") {
      event.preventDefault(); // prevent default browser behavior
      open();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
</script>

<div class="relative group">
  <!-- Search button -->
  <button
    on:click={open}
    type="button"
    aria-label="Search posts"
    class="flex items-center justify-center w-8 h-8 rounded-full shadow-sm
           bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100
           transition-colors duration-200 hover:scale-105 active:scale-95"
  >
    <!-- Magnifying glass SVG -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-4 h-4 block"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"/>
    </svg>
  </button>

  <!-- Tooltip below -->
  <span
    class="absolute top-full mt-2 left-1/2 transform -translate-x-1/2
           px-2 py-1 rounded text-xs font-medium
            bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white
           opacity-0 group-hover:opacity-100 group-focus:opacity-100
           transition-opacity duration-200 pointer-events-none whitespace-nowrap"
  >
    <span class="flex items-center gap-2">
      <span>Search</span>
      <span class="inline-flex items-center gap-1">
        <span class="inline-block px-2 py-1 text-xs font-semibold border border-white font-mono rounded">⌘</span>
        <span class="inline-block px-2 py-1 text-xs font-semibold border border-white font-mono rounded">K</span>
      </span>
    </span>
  </span>
</div>

<!-- Dialog -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
  bind:this={dialog}
  on:click={close}
  class="w-11/12 max-w-lg sm:max-w-2xl p-6 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
         backdrop:bg-black backdrop:bg-opacity-40 shadow-xl sm:shadow-2xl"
>
  <form method="dialog" on:click|stopPropagation class="flex flex-col">
    <input
      type="text"
      bind:value={query}
      placeholder="Search posts..."
      class="w-full px-4 py-3 mb-4 border border-gray-300 dark:border-gray-700 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
             bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100
             placeholder-gray-500 dark:placeholder-gray-400 transition duration-200"
      autofocus
    />

    {#if query}
      <ul
        class="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-inner"
      >
        {#if filteredPosts.length > 0}
          {#each filteredPosts as post}
            <li class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <a href={`/blog/${post.slug}`} class="block">
                <h2 class="font-semibold text-lg">{post.data.title}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(post.data.pubDate).toDateString()}
                </p>
              </a>
            </li>
          {/each}
        {:else}
          <li class="p-4 text-gray-500 dark:text-gray-400">No posts found</li>
        {/if}
      </ul>
    {/if}
  </form>
</dialog>
