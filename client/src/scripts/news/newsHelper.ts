/**
 * Be sure to add new posts to the TOP of the JSON array!
 * Fields:
 *  - date (required): The UNIX timestamp for Date.now() in milliseconds.
 *  - author (required): Whoever wrote the post. If you do not wish to list yourself, then simply label it as "Suroi Developers."
 *  - title (required): Title of the post.
 *  - bannerImage (optional): The URL of the banner image for the news post. It should have a 2:1 or greater aspect ratio.
 *  - content (required): Brief information about the news post that appears on the homepage. Remember to use backslashes \ before any quotation marks! Supports HTML.
 *  - longContent (optional): Longer information for the news page. Defaults to the value of content. Supports HTML.
 */

export interface NewsPost {
    readonly date: number
    readonly author: string
    readonly title: string
    readonly bannerImage?: string
    readonly content: string
    readonly longContent?: string
}

export function processPost(post: NewsPost): string {
    let newsText = "";

    const date = new Date(post.date).toLocaleDateString("default", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    newsText += '<article class="splash-news-entry">';
    newsText += `<h3 class="news-title">${post.title}</h3>`;
    newsText += `<div class="news-date">${date}`;
    newsText += `<br><i>Written by: ${post.author}</i>`;
    newsText += "</div>";

    if (post.bannerImage !== undefined) {
        newsText += `<span class="news-banner"><img src="${post.bannerImage}" alt="${post.title}"></span><br>`;
    }

    if (post.longContent !== undefined) {
        newsText += `<div class="short-desc">${post.content}</div>`;
        newsText += `<div class="long-desc">${post.longContent}</div>`;
    } else {
        newsText += `<div class="long-desc">${post.content}</div>`;
    }

    newsText += "</article>";

    return newsText;
}
