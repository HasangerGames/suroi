import { rules } from "./rulePosts";

let ruleText = "";
for (const rulePost of rules.slice(0, 5)) {
    const date = new Date(rulePost.date).toLocaleDateString("default", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    ruleText += '<article class="splash-rule-entry">';
    ruleText += `<div class="news-date">${date}</div>`;
    ruleText += `<div class="news-title">${rulePost.title}</div>`;
    ruleText += `<p>${rulePost.content}<br><i>- ${rulePost.author}</i></p></article>`;
}

$("#news-posts").html(ruleText);
