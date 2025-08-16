<script lang="ts">
  interface Heading {
    depth: number;
    slug: string;
    text: string;
  }

  export let headings: Heading[] = [];

  let isExpanded = false;

  // Filter out h1 headings (usually the title) and only show h2, h3, h4
  $: tocHeadings = headings.filter(heading => heading.depth > 1);

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  function smoothScrollToSection(event: Event, targetId: string) {
    event.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const navbarHeight = 96; // 6rem in pixels
      const targetPosition = targetElement.offsetTop - navbarHeight - 20; // Extra 20px offset
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  }
</script>

{#if tocHeadings.length > 0}
  <nav class="toc-sidebar bg-[#bf9bff4d] text-black dark:bg-black dark:text-white" class:toc-expanded={isExpanded} aria-label="Table of contents">
    <div class="toc-header" class:collapsed={!isExpanded} on:click={toggleExpanded}>
      <h3 class="toc-title">Contents</h3>
      <button 
        class="toc-toggle" 
        aria-label="Toggle table of contents"
        aria-expanded={isExpanded}
        on:click|stopPropagation={toggleExpanded}
      >
        <svg class="toc-toggle-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
        </svg>
      </button>
    </div>
    <div class="toc-content">
      <ul class="toc-list">
        {#each tocHeadings as heading}
          <li class="toc-item toc-depth-{heading.depth}">
            <a 
              href="#{heading.slug}"
              class="toc-link"
              data-depth={heading.depth}
              on:click={(e) => smoothScrollToSection(e, heading.slug)}
            >
              {heading.text}
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </nav>
{/if}

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .toc-sidebar {
    position: sticky;
    top: 6rem;
    width: 280px;
    height: fit-content;
    max-height: 80vh;
    overflow-y: auto;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 1rem;
    margin: 2rem 0 0 2rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .toc-sidebar::-webkit-scrollbar {
    width: 6px;
  }

  .toc-sidebar::-webkit-scrollbar-track {
    background: transparent;
  }

  .toc-sidebar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .toc-header {
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    margin-bottom: 0.75rem;
  }

  .toc-header.collapsed {
    border-bottom: none;
    padding: 0.125rem 0.375rem;
    margin-bottom: 0.375rem;
  }

  .toc-header:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .toc-title {
    font-size: 1.1rem;
    margin: 0;
  }

  .toc-toggle {
    display: none;
    background: none;
    border: none;
    color: #d1d5db;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }

  .toc-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f3f4f6;
  }

  .toc-toggle-icon {
    transition: transform 0.2s ease;
  }

  .toc-content {
    transition: max-height 0.3s ease;
  }

  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc-item {
    margin-bottom: 0.5rem;
  }

  .toc-item:last-child {
    margin-bottom: 0;
  }

  .toc-link {
    display: block;
    padding: 0.5rem 0.75rem;
    text-decoration: none;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
    font-size: 0.9rem;
    line-height: 1.4;
    scroll-behavior: smooth;
  }

  .toc-link:hover {
    background: rgba(255, 255, 255, 0.1);
    /* color: #f3f4f6; */
  }

  .toc-link[data-depth="2"] {
  }

  .toc-link[data-depth="3"] {
    padding-left: 1.5rem;
  }

  .toc-link[data-depth="4"] {
    padding-left: 2.25rem;
    font-size: 0.85rem;
  }

  .toc-sidebar nav {
    margin: 0;
    padding: 0;
  }

  /* Mobile responsiveness */
  @media (max-width: 1024px) {
    .toc-sidebar {
      position: static;
      width: 100%;
      margin: 2rem 0 0 0;
      max-height: none;
    }

    .toc-toggle {
      display: block;
    }

    .toc-content {
      max-height: 0;
      overflow: hidden;
    }

    .toc-sidebar.toc-expanded .toc-content {
      max-height: 500px;
    }

    .toc-sidebar.toc-expanded .toc-toggle-icon {
      transform: rotate(180deg);
    }
  }
</style> 