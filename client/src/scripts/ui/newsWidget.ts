import { news } from "./newsPosts";

let newsText = "";
for (const newsPost of news.slice(0, 5)) {
    newsText += '<article class="splash-news-entry">';
    const date: string = new Date(newsPost.date)
        .toLocaleDateString("default", {
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    newsText += `<div class="news-date">${date}</div>`;
    newsText += `<div class="news-title">${newsPost.title}</div>`;
    newsText += `<p>${newsPost.content}<br><i>- ${newsPost.author}</i></p></article>`;
}

$("#news-posts").html(newsText);
