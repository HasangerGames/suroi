/* eslint-disable quotes,@typescript-eslint/quotes */
export interface NewsPost {
    date: number
    author: string
    title: string
    bannerImage?: string
    content: string
    longContent?: string
}

export const news: NewsPost[] = [
    {
        date: 1684625426939,
        author: "hasanger",
        title: "We're back, baby",
        bannerImage: require("../../assets/img/news/beta-release.png"),
        content: `Kongregate may have shut down Surviv Reloaded, but that's not gonna stop me! Today, I'm releasing the first ever beta version of Suroi, an open-source 2D battle royale game inspired by surviv.io.
To report a bug or suggest something, <a href="https://discord.suroi.io" target="_blank" rel="noopener noreferrer">join the Discord server.</a> If you have any questions, check out the FAQ on <a href="https://suroi.io/news" target="_blank" rel="noopener noreferrer">the news page.</a>`,
        longContent: `<h2 class="post-header">FAQ</h2>
<h3 class="post-header">What is Suroi?</h3>
<p>Suroi is a new open-source 2D battle royale game inspired by surviv.io. After Surviv Reloaded, my first surviv.io revival project, got DMCA'd by Kongregate, the Surviv Reloaded team started work on a new game, Suroi. Suroi is similar to surviv, but it's built from the ground up with 100% original assets and code.</p>

<h3 class="post-header">Why isn't [feature] in the game yet? When will [feature] be added?</h3>
<p>The initial beta version of Suroi is very basic. Essential features like guns will be added in the next few weeks. For more information, check out the #roadmap channel on the Discord.</p>

<h3 class="post-header">I can't move.</h3>
<p>As the game is in early beta, we haven't added mobile controls yet. If you're on a mobile device, like a phone or tablet, there's no way to move yet.</p>

<h3 class="post-header">My game is laggy.</h3>
<p>The server is hosted in the United States. If you live far away from the US or you have slow Internet, lag is to be expected. In the future, servers will be hosted in other countries.</p>

<h3 class="post-header">I found a bug.</h3>
<p>To report a bug or suggest something, join the Discord. Post bugs in the #bugs channel, and suggestions in #suggestions. Before reporting a bug, please check to make sure someone else hasn't reported it already.</p>
`
    }
];
