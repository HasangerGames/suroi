/**
 * Be sure to add new posts to the TOP of the JSON array!
 * Fields:
 *  - date (required): The UNIX timestamp for Date.now() in milliseconds.
 *  - author (required): Whoever wrote the post. If you do not wish to list yourself, then simply label it as "Suroi Developers."
 *  - title (required): Title of the post.
 *  - bannerImage (optional): The URL of the banner image for the news post. It should have a 2:1 or greater aspect ratio.
 *  - content (required): Brief information about the news psot that appears on the homepage. Remember to use backslashes \ before any quotation marks! Supports HTML.
 *  - longContent (optional): Longer information for the news page. Defaults to the value of content. Supports HTML.
 */

import { news } from "./newsPosts";

let newsText = "";
for (const newsPost of news) {
    const date: string = new Date(newsPost.date).toLocaleDateString("default", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    newsText += '<article class="splash-news-entry">';
    newsText += `<h3 class="news-title">${newsPost.title}</h3>`;
    newsText += `<div class="news-date">${date}`;
    newsText += `<br><i>Written by: ${newsPost.author}</i>`;
    newsText += "</div>";

    if (newsPost.bannerImage !== undefined) {
        newsText += `<span class="news-banner"><img src="${newsPost.bannerImage}" alt="${newsPost.title}"></span><br>`;
    }

    if (newsPost.longContent !== undefined) {
        newsText += `<div class="short-desc">${newsPost.content}</div>`;
        newsText += `<div class="long-desc">${newsPost.longContent}</div>`;
    } else {
        newsText += `<div class="long-desc">${newsPost.content}</div>`;
    }

    newsText += "</article>";
}

$("#news-articles").html(newsText);
