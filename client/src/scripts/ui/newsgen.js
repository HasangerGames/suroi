import newsJson from "../../assets/json/newsposts.json";
/*
     I made this in js because ts = L
     **Be sure to add new news posts to the TOP of the JSON array!**
     Instructions Below
     --- If you don't want to fill in an optional value, leave it as a blank string "" ---
      1. Date (required): the UNIX timestamp for Date.now() in ms
      2. Author (required): whoever wrote the post. If you don't want to put yourself then just put Suroi Developers
      3. Banner (optional): Banner image for the news post should have a 2:1 length:height aspect ratio OR GREATER
      4. Title (required): Title for the post
      5. Content (required): Short info about the news post that appears on the homepage. **Remember to use backslashes \ before any quotation marks!** Supports HTML.
      6. Longcontent (optional): Longer info for the news page. If no longcontent is set, then the content becomes the long content. Supports HTML.
 */        
const newsList = newsJson.news;
let newsText = ""
for (const newsPost of newsList) {
  newsText += `<article class="splash-news-entry">`
  newsText += `<h3 class="news-title">` + newsPost.title + `</h3>`
  newsText += `<div class="news-date">` + (new Date(newsPost.date)).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })
  if (newsPost.author.length > 1) {
    newsText += `<br><i>Written by: ` + newsPost.author + `</i>`
  }
  newsText += "</div>"
  if (newsPost.banner !== "") {
    newsText += `<span class="news-banner"><img src="` + newsPost.banner + `"></span><br>`
  }
  if (newsPost.longcontent.length > 1) {
    newsText += `<div class="short-desc">` + newsPost.content + `</div>`;
    newsText += `<div class="long-desc">` + newsPost.longcontent + `</div>`;
  } else {
    newsText += `<div class="long-desc">` + newsPost.content + `</div>`;
  }
  newsText += "</article>";
}
document.getElementById("news-articles").innerHTML = newsText;