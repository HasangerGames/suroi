<script lang="ts">
    import { onMount } from "svelte";
    import type { Post } from "../../vite/news-posts-plugin/news-posts-plugin";
    import { humanDate } from "../../src/scripts/utils/misc";

    let posts: Post[];
    onMount(async() => posts = (await import("virtual:news-posts")).posts as Post[]);
  </script>

  {#each posts as post}
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
        {#if post.body}
          <div class="short-desc">{@html post.description}</div>
          <div class="long-desc">{@html post.body}</div>
        {:else}
          <div class="long-desc">{@html post.description}</div>
        {/if}
    </article>
  {/each}
