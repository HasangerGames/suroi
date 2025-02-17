<script lang="ts">
    import type { Post } from "./newsPosts";

    export let posts: Post[];
</script>

{#each posts as post}
    <article class="splash-news-entry">
        <h3 class="news-title">{post.title}</h3>
        <div class="news-date">
            {new Date(post.date).toLocaleDateString("default", {
                month: "long",
                day: "numeric",
                year: "numeric"
            })}
            <br>
            <i>Written by: {post.author}</i>
        </div>
        {#if post.bannerImage}
            <span class="news-banner"><img src="{post.bannerImage}" alt="{post.title}"></span><br>
        {/if}
        {#if post.longContent}
            <div class="short-desc">{@html post.content}</div>
            <div class="long-desc">{@html post.longContent}</div>
        {:else}
            <div class="long-desc">{@html post.content}</div>
        {/if}
    </article>
{/each}
