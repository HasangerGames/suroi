/*
Be sure to add new news posts to the TOP of the JSON array!
Fields:
- date (required): the UNIX timestamp for Date.now() in ms
- author (required): whoever wrote the post. If you don't want to put yourself then just put Suroi Developers
- title (required): Title of the post.
- bannerImage (optional): The URL of the banner image for the news post. It should have a 2:1 length:height aspect ratio or greater.
- content (required): Short info about the news post that appears on the homepage. Remember to use backslashes \ before any quotation marks! Supports HTML.
- longContent (optional): Longer info for the news page. If no longContent is set, then the content becomes the long content. Supports HTML.
*/

import news from "../../assets/json/news.json";

export interface NewsPost {
    date: number
    author: string
    title: string
    bannerImage?: string
    content: string
    longContent?: string
}

let newsText = "";
for (const newsPost of news as NewsPost[]) {
    newsText += '<article class="splash-news-entry">';
    newsText += `<h3 class="news-title">${newsPost.title}</h3>`;
    const date: string = new Date(newsPost.date)
        .toLocaleDateString("default", {
            month: "long",
            day: "numeric",
            year: "numeric"
        });
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
