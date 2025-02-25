<script lang="ts">
  export let page: number;
  export let pages: number;

  function toPage(newPage: number): void {
    page = newPage;
    window.scrollTo(0, 0);
  }

  $: backBtnsDisabled = page === 0 ? "btn-disabled" : "";
  $: forwardBtnsDisabled = page === pages - 1 ? "btn-disabled" : "";
</script>

<div id="pagination">
  <button
    class="btn btn-lg btn-darken btn-primary {backBtnsDisabled}"
    aria-label="First page"
    on:click={() => toPage(0)}
  >
    <i class="fa-solid fa-angles-left"></i>
  </button>
  <button
    class="btn btn-lg btn-darken btn-primary {backBtnsDisabled}"
    aria-label="Previous page"
    on:click={() => toPage(page - 1)}
  >
    <i class="fa-solid fa-chevron-left"></i>
  </button>

  <span style="user-select: none">Page {page + 1} / {pages}</span>

  <button
    class="btn btn-lg btn-darken btn-primary {forwardBtnsDisabled}"
    aria-label="Next page"
    on:click={() => toPage(page + 1)}
  >
    <i class="fa-solid fa-chevron-right"></i>
  </button>
  <button
    class="btn btn-lg btn-darken btn-primary {forwardBtnsDisabled}"
    aria-label="Last page"
    on:click={() => toPage(pages - 1)}
  >
    <i class="fa-solid fa-angles-right"></i>
  </button>
</div>

<style lang="scss">
  #pagination {
    display: flex;
    align-items: center;
    gap: 15px;
    margin: 0 auto;
  }
</style>
