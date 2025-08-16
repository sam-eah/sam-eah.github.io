<script lang="ts">
  let wrapper: HTMLElement;
  
  function handleMouseMove(e: MouseEvent) {
    if (wrapper) {
      wrapper.style.setProperty('--mouse-x', `${e.clientX}px`);
      wrapper.style.setProperty('--mouse-y', `${e.clientY}px`);
    }
  }
</script>

<div class="spotlight-wrapper" bind:this={wrapper}>
  <a href="/" class="hidden" aria-hidden="true">Home</a>
  <a href="/cv" class="hidden" aria-hidden="true">CV</a>
  <slot />
</div>

<svelte:window on:mousemove={handleMouseMove}/>

<style>
  .spotlight-wrapper {
    position: relative;
    min-height: 100vh;
  }
  
  .spotlight-wrapper::before {
    content: "";
    position: fixed;
    inset: 0;
    background: radial-gradient(
      400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
      rgba(139, 92, 246, 0.20),
      rgba(99, 102, 241, 0.12) 25%,
      transparent 45%
    );
    pointer-events: none;
    z-index: 0;
    transition: background 0.3s;
  }
</style>
