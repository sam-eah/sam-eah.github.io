<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import Mission from './Mission.svelte';

  export let missions: ComponentProps<Mission>[];
</script>

<div class="flex flex-col gap-6">
  {#each missions as mission}
    <Mission {...mission} />
  {/each}
</div>
