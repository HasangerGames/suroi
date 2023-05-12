import newsJson from "../../assets/json/newsposts.json";
/*
     I made this in js because ts = L
     **Be sure to add new news posts to the TOP of the JSON array!**
     **YOU NEED TO PUT BACKSLASHES \ BEFORE QUOTATION MARKS OR YOU BREAK THE THING. If you want me to code a discord plugin for that I'd be happy to.
 */        
const newsList = newsJson.news.slice(0, 5);
let newsText = ""
for (const newsPost of newsList) {
  newsText += `<article class="splash-news-entry">`
  newsText += `<div class="news-date">` + (new Date(newsPost.date)).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' }) + `</div>`
  newsText += `<div class="news-title">` + newsPost.title + `</div>`
  newsText += `<p>` + newsPost.content + `<i><br/> - ` + newsPost.author + `</i></p></article>`;
}
document.getElementById("news-posts").innerHTML = newsText;