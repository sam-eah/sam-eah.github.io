<script lang="ts">
  export let position: string = '';
  export let company: string | undefined = '';
  export let location: string | undefined = '';
  export let dates: string | undefined = '';
  export let description: string | undefined = '';
  export let tasks: string[] = [];
  export let stack: string | undefined = '';
</script>

<details class="border-gray-500 border rounded-md p-2">
  <summary>
    <span>
      <span class="font-bold">{position}</span>
      {#if location}
        <div>📍 {location}</div>
      {/if}

      {#if company}
        <div>💼 {company}</div>
      {/if}
    </span>
    {#if dates}
      <div class="text-right">📅 {dates}</div>
    {/if}
  </summary>
  <div class="content">
    <div>
      {#if description}
        <p style="margin-bottom: 1em;">{description}</p>
      {/if}
      <ul>
        {#each tasks as task}
          <li>{task}</li>
        {/each}
      </ul>
      <h5>{stack}</h5>

      <div class="flex flex-col gap-6">
        <slot />
      </div>
    </div>
  </div>
</details>

<style>
  details {
    /* background: gainsboro; */
    padding: 10px;
  }

  details > div {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 500ms;
    overflow: hidden;
  }

  details > summary {
    cursor: pointer;
    transition: margin 150ms ease-out;
  }

  details[open] summary {
    margin-bottom: 1px;
  }

  details[open] > div {
    grid-template-rows: 1fr;
  }

  .content > div {
    overflow: hidden;
  }
</style>
