<script lang="ts">
  export let position: string = "";
  export let company: string | undefined = "";
  export let location: string | undefined = "";
  export let dates: string | undefined = "";
  export let description: string | undefined = "";
  export let tasks: string[] = [];
  export let stack: string | undefined = "";
</script>

<div
  class="bg-white dark:bg-gray-900 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"
>
  <details class="group">
    <summary
      class="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
    >
      <div class="space-y-3">
        <div class="flex items-baseline gap-2">
          <!-- Expandable indicator -->
          <div
            class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors duration-200"
          >
            <svg
              class="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-all duration-200 group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <h3
            class="text-xl mt-1 sm:mt-1 md:mt-1 lg:mt-1 xl:mt-1 font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 leading-tight"
          >
            {position}
          </h3>
        </div>

        <div
          class="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400"
        >
          {#if company}
            <div class="flex items-center gap-2">
              <span class="text-purple-500">💼</span>
              <span class="font-medium">{company}</span>
            </div>
          {/if}

          {#if location}
            <div class="flex items-center gap-2">
              <span class="text-purple-500">📍</span>
              <span>{location}</span>
            </div>
          {/if}

          {#if dates}
            <span
              class="inline-flex items-center text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full"
            >
              📅 {dates}
            </span>
          {/if}
        </div>
      </div>
    </summary>

    <div class="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
      <div class="pt-4 space-y-4">
        {#if description}
          <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
            {description}
          </p>
        {/if}

        {#if tasks.length > 0}
          <div>
            <h4
              class="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide"
            >
              Key Responsibilities
            </h4>
            <ul class="space-y-2">
              {#each tasks as task}
                <li
                  class="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                >
                  <span class="text-purple-500 mt-1 flex-shrink-0">•</span>
                  <span class="leading-relaxed">{task}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if stack}
          <div>
            <h4
              class="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide"
            >
              Tech Stack
            </h4>
            <div class="flex flex-wrap gap-2">
              {#each stack.split(",").map((s) => s.trim()) as tech}
                <span
                  class="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700"
                >
                  {tech}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <div class="flex flex-col gap-6">
          <slot />
        </div>
      </div>
    </div>
  </details>
</div>

<style>
  details > div {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 500ms ease-out;
    overflow: hidden;
  }

  details[open] > div {
    grid-template-rows: 1fr;
  }

  details > summary {
    list-style: none;
  }

  details > summary::-webkit-details-marker {
    display: none;
  }

  /* Chevron rotation when open */
  details[open] .group-open\:rotate-180 {
    transform: rotate(180deg);
  }
</style>
