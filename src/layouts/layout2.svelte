<script>
  import { swipe } from 'svelte-gestures';

  let a;
  let b;
  let body;

  function animate(direction) {
    body.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${direction === 'right' ? '' : '-'}100%)` },
      ],
      {
        duration: 500,
        iterations: 1,
      }
    );
  }

  function handler(event) {
    console.log(event.detail, window.location);

    if (location.pathname === '/cv' && event.detail.direction === 'right') {
      a.click();
      animate(event.detail.direction);
      return;
    }

    if (location.pathname !== '/cv' && event.detail.direction === 'left') {
      b.click();
      animate(event.detail.direction);
      return;
    }
  }
</script>

<div
  use:swipe={{ timeframe: 300, minSwipeDistance: 60, touchAction: 'pan-y' }}
  on:swipe={handler}
  bind:this={body}
>
  <a href="/" class="hidden" bind:this={a} />
  <a href="/cv" class="hidden" bind:this={b} />
  <slot />
</div>
