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

import { rules } from "./rulePosts";

$("#rule-articles").html(
    rules.map(
        post => {
            let ruleText = "";

            const date = new Date(post.date).toLocaleDateString("default", {
                month: "long",
                day: "numeric",
                year: "numeric"
            });

            ruleText += '<article class="splash-rule-entry">';
            ruleText += `<h3 class="rule-title">${post.title}</h3>`;
            ruleText += `<div class="rule-date">${date}`;
            ruleText += `<br><i>Written by: ${post.author}</i>`;
            ruleText += "</div>";

            if (post.bannerImage !== undefined) {
                ruleText += `<span class="rule-banner"><img src="${post.bannerImage}" alt="${post.title}"></span><br>`;
            }

            if (post.longContent !== undefined) {
                ruleText += `<div class="short-desc">${post.content}</div>`;
                ruleText += `<div class="long-desc">${post.longContent}</div>`;
            } else {
                ruleText += `<div class="long-desc">${post.content}</div>`;
            }

            ruleText += "</article>";

            return ruleText;
        }
    ).join("")
);
