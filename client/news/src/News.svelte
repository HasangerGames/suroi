<script lang="ts">
  import { onMount } from "svelte";
  import type { NewsPost } from "../../vite/plugins/news-posts-plugin";
  import { humanDate } from "../../src/scripts/utils/misc";
  import { Numeric } from "@common/utils/math";
  import Pagination from "./Pagination.svelte";
  import { writable } from "svelte/store";
  import { posts as newsPosts } from "virtual:news-posts";

  let posts: NewsPost[];
  export let page = writable(0);
  let perPage = 5;
  export let pages: number;

  onMount(() => {
    posts = newsPosts as NewsPost[];
    pages = Math.ceil(posts.length / perPage);
  });

  $: currentPage = posts?.slice(Numeric.min($page * perPage, posts.length), Numeric.min(($page + 1) * perPage, posts.length));
</script>

<Pagination bind:page={$page} {pages} />
{#each currentPage as post}
  <article class="splash-news-entry">
    <h3 class="news-title">{post.title}</h3>
    <div class="news-date">
      {humanDate(post.date)}
      <br>
      <i>Written by: {post.author}</i>
    </div>
    {#if post.bannerImage}
      <span class="news-banner"><img src="../img/news/{post.bannerImage}" alt="{post.title}"></span><br>
    {/if}
    <div class="short-desc">{@html post.description}</div>
    {#if post.body}
      <div class="long-desc">{@html post.body}</div>
    {/if}
  </article>
{/each}
<Pagination bind:page={$page} {pages} />
