<script>
  import { onMount } from 'svelte';

  let dialog;

  // onMount(() => {
  // });

  function open() {
    dialog.showModal();
  }

  function close(event) {
    if (event.target === dialog) {
      dialog.close();
    }
  }
</script>

<button on:click={open}>Search</button>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
  bind:this={dialog}
  class="backdrop:bg-black backdrop:bg-opacity-50"
  on:click={close}
>
  <form method="dialog">
    <label for="search" />
    <input type="text" id="search" placeholder="search" />
  </form>
</dialog>
