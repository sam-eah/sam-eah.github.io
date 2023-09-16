<script>
  import { swipe } from 'svelte-gestures';

  let a;
  let b;

  function handler(event) {
    console.log(event.detail, window.location);

    if (location.pathname === '/cv' && event.detail.direction === 'right') {
      a.click();
    }

    if (location.pathname !== '/cv' && event.detail.direction === 'left') {
      b.click();
    }
  }
</script>

<div use:swipe={{ timeframe: 300, minSwipeDistance: 60 }} on:swipe={handler}>
  <a href="/" class="hidden" bind:this={a} />
  <a href="/cv" class="hidden" bind:this={b} />
  <slot />
</div>
