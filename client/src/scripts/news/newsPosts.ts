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
        date: 1687625334000,
        author: "HAZEL",
        title: "Locked & Loaded",
        bannerImage: require("../../assets/img/news/v0.5.0.png"),
        content: `The newest supply shipment to the island has arrived, along with a slew of new weapons! Blast enemies all day long with the 47 round pan on the Lewis gun, or test your marksmanship with the Tango 51. Prefer hand-to-hand combat? The K-bar or the baseball bat may be for you. A glint of gold may yield a fruitful surprise...`,
        longContent: `<h2>Suroi v0.5.0</h2>

<h3>New features</h3>
<ul>
    <li>Ammo and reloading! Guns now require ammo and need to be reloaded.</li>
    <li>Melee weapons! Added 2 melee weapons: the K-bar (a knife), and the baseball bat.</li>
    <li>More guns! Added 6 guns: the Lewis Gun (an LMG), MCX Spear (an assault rifle), Micro Uzi (an SMG), Tango 51 (a sniper), 940 Pro (a shotgun), and M16A4 (a burst fire assault rifle).</li>
    <li>New crates! Added the AEGIS and Flint crates, which drop better loot than regular crates. Also added gauze, cola, and melee crates.</li>
    <li>New obstacles! Added the oil tank, gold rock, and birch tree. The oil tank is an indestructible obstacle that makes for good cover. The gold rock drops a Mosin-Nagant; only one spawns per map.</li>
    <li>More obstacle variations! Added mossy and cracked variants of the rock.</li>
</ul>`
    },
    {
        date: 1687026036000,
        author: "Dr. Felix Sterling",
        title: "Supplies received",
        bannerImage: require("../../assets/img/news/v0.4.0.png"),
        content: `We have received the new arms and supply shipment from Mr. Flint. In the crates were all four weapons promised: the Mosin-Nagant, Ithaca Model 37, SAF-200, and Glock 19. These should help us dramatically, as we were in great need of additional and varied firepower. Additionally, the new medical items, gauze, colas, and medikits, will allow better treatment of injuries. However, they were not of the portable variety we requested, and we hope to resolve this soon.`,
        longContent: `<h2>Suroi v0.4.0</h2>

<h3>New features & changes</h3>
<ul>
  <li>Loot! Crates now drop guns and healing items. Players no longer spawn with guns.</li>
  <li>More guns! Added 4 guns: the Mosin-Nagant (a sniper), Model 37 (a pump shotgun), SAF-200 (a burst fire SMG), and G19 (a full auto pistol). Recoil has also been added, meaning guns slow you down when firing.</li>
  <li>Server selector! You can now choose between 3 servers: one in North America (Detroit, Michigan), one in Europe (London, England), and one in Asia (Osaka, Japan).</li>
  <li>Added an "Equip Other Gun" keybind (defaults to space bar).</li>
  <li>Added a "Swap Gun Slots" keybind (defaults to T).</li>
  <li>Added a keybind to toggle the minimap (defaults to N).</li>
  <li>Added an option to disable mobile controls, for those playing on a mobile device with a mouse and keyboard.</li>
  <li>Increased M3K fire rate; decreased damage.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed a bug allowing players to move twice as fast when using the mobile controls and movement keys at the same time.</li>
  <li>Fixed a bug causing players' fists to get stuck in incorrect positions.</li>
  <li>Fixed weapon switch sounds playing for all players, not just the active player.</li>
</ul>`
    },
    {
        date: 1685914769000,
        author: "Dr. Petrova",
        title: "2, 8, 18, 7",
        bannerImage: require("../../assets/img/news/v0.3.0.png"),
        content: `A mysterious orange gas is now being reported around the island. We collected a sample and were able to convert it to a solid at -7.2°C, but found it to be very toxic. You’ve been warned! In other news, if you’re the last one on the island left, you’ll get your very own chicken dinner courtesy of HAZEL, the perfect meal to enjoy your victory!`,
        longContent: `<h2>Suroi v0.3.0</h2>
<h3>New features</h3>
<ul>
  <li>Gas! Toxic gas now slowly fills up the map as the game progresses.</li>
  <li>Chicken dinners! If you're the last man standing, you now get to enjoy a delicious chicken dinner.</li>
  <li>Minimap! There is now a minimap in the top left. To expand it, press G or M. On mobile, simply tap the map.</li>
  <li>Mobile controls! Suroi is now playable on mobile. To use the controls, simply press and drag. The left joystick (left half of the screen) controls movement, and the right joystick (right half of the screen) controls aim and shooting.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Bullets now spawn at the barrel of the gun instead of at the player body.</li>
  <li>Fixed a visual bug causing bullets to go in the wrong direction near the edges of the map.</li>
  <li>Fixed a bug causing the wrong gun to continue firing when quickswitching.</li>
  <li>Fixed a bug allowing players to see more of the map by zooming out.</li>
</ul>`
    },
    {
        date: 1685317752000,
        author: "hasanger",
        title: "Fun guns",
        bannerImage: require("../../assets/img/news/v0.2.0.png"),
        content: `This week's update introduces guns, health crates, and keybinds! There are only 2 guns for now: the AK-47 and the M3K. More will be added soon.<br>If you're having issues with textures, try <a href="https://its.uiowa.edu/support/article/719">clearing your cache.</a>`,
        longContent: `<h2>Suroi v0.2.0</h2>
<h3>New features</h3>
<ul>
    <li>Guns! Added the AK-47 and M3K. More guns will be added soon, including the Mosin-Nagant.</li>
    <li>Health crates! These crates restore your health when broken. They are a temporary addition and will be removed once proper healing items are added.</li>
    <li>Keybinds! You can now remap keys. To edit keybinds, click the gear icon in the bottom right, or in-game, press Escape and click on Settings. Then, click on the Keybinds tab.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed a visual bug causing players' fists to get stuck in the punching position.</li>
</ul>`
    },
    {
        date: 1684625426000,
        author: "hasanger",
        title: "We're back, baby",
        bannerImage: require("../../assets/img/news/v0.1.0.png"),
        content: `Kongregate may have shut down Surviv Reloaded, but that's not gonna stop me! Today, I'm releasing the first ever beta version of Suroi, an open-source 2D battle royale game inspired by surviv.io.
To report a bug or suggest something, <a href="https://discord.suroi.io" target="_blank" rel="noopener noreferrer">join the Discord server</a>. If you have any questions, check out the FAQ on <a href="https://suroi.io/news" target="_blank" rel="noopener noreferrer">the news page</a>.`,
        longContent: `<h2>FAQ</h2>
<h3>What is Suroi?</h3>
<p>Suroi is a new open-source 2D battle royale game inspired by surviv.io. After Surviv Reloaded, my first surviv.io revival project, got DMCA'd by Kongregate, the Surviv Reloaded team started work on a new game, Suroi. Suroi is similar to surviv, but it's built from the ground up with 100% original assets and code.</p>

<h3>Why isn't [feature] in the game yet? When will [feature] be added?</h3>
<p>The initial beta version of Suroi is very basic. Essential features like guns, loot, and buildings will be added in the next few weeks. For more information, check out the #roadmap channel on the Discord.</p>

<h3>I can't move.</h3>
<p>As the game is in early beta, we haven't added mobile controls yet. If you're on a mobile device, like a phone or tablet, there's no way to move yet.</p>

<h3>My game is laggy.</h3>
<p>The server is hosted in the United States. If you live far away from the US or you have slow Internet, lag is to be expected. In the future, servers will be hosted in other countries.</p>

<h3>I found a bug.</h3>
<p>To report a bug or suggest a feature, join the Discord. Post bugs in the #bugs channel, and suggestions in #suggestions. Before reporting a bug, please check to make sure someone else hasn't reported it already.</p>`
    }
];
