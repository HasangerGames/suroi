/* eslint-disable quotes,@typescript-eslint/quotes */
import { type NewsPost } from "./newsHelper";

export const news: NewsPost[] = [
    {
        date: 1698001957000,
        author: "HAZEL",
        title: "Making Waves",
        bannerImage: "./img/news/v0.11.0.png",
        content: `The island grows ever busier with the newest structure, the port. Search the warehouses and shipping containers for loot, 'cause they’re packed! Containers can also be found throughout the island. But the most valuable loot is contained in the bow of the massive container ship. A highly prized sniper lies within, but you’ll need to solve a puzzle to get in.<br><br>

If you like swimming, you’re in luck! Rivers now snake through the landscape, and the ocean is now accessible.<br><br>

We've added two new guns to our arsenal: the Flues, a sawn-off double-barrel shotgun, and the M1895, a revolver.<br><br>

In addition, we've made many quality of life changes, including shorter guns, custom crosshairs, and a kill leader mechanic.`,
        longContent: `<h2>Suroi v0.11.0</h2>
<h3>New features & changes</h3>
<ul>
  <li>Rivers & ocean! Rivers have been added. The ocean is now accessible.</li>
  <li>New buildings! Added the port, the largest structure so far. Added shipping containers, which spawn at the port and throughout the map.</li>
  <li>More guns! Added 2 guns: the Flues (a sawn-off double-barrel shotgun, equivalent to surviv's MP220), and the M1895 (a revolver).</li>
  <li>The big house has been replaced by a smaller variant. The big variant will be overhauled and re-added in a future update.</li>
  <li>Shorter guns! Gun world images have been shortened.</li>
  <li>Kill leader! A kill leader mechanic has been added. The player with the most kills, if it's more than 3, is awarded the title of Kill Leader, and their name and kill count appears in the top right.</li>
  <li>3 games can now start at the same time, which should reduce late spawning issues.</li>
  <li>Custom crosshairs! You can now choose between various crosshair styles, and customize the color and outline.</li>
  <li>Mobile improvements!</li>
  <ul>
    <li>The left joystick now controls rotation as well as movement. Rotation is overridden by the right joystick.</li>
      <li>Snipers now shoot when releasing the joystick.</li>
      <li>Added an aim line.</li>
      <li>Doors now open automatically when approaching them.</li>
  </ul>
  <li>The server with the best ping is now selected automatically. Player count and ping is now displayed for each server.</li>
  <li>The North America and Europe servers have been upgraded again.</li>
  <li>The Play Again button now allows you to rejoin the game with 1 click. To return to the menu, click the Menu button.</li>
  <li>Explosive obstacles now emit smoke particles when they're close to destroyed.</li>
  <li>You can now click on players to spectate them, which should make it easier to report teamers.</li>
  <li>Ammo is now split up when dropped from dead players.</li>
  <li>Removed join and leave messages.</li>
  <li>You can now hide under tables.</li>
  <li>Added an option to hide the rules button.</li>
  <li>Added an option to display coordinates.</li>
  <li>Added an option to enable the old menu music.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed full auto guns not continuing to fire when holding the fire button/joystick after reloading.</li>
  <li>Fixed more issues with auto loot pickup on mobile.</li>
  <li>Fixed muzzle flash position.</li>
  <li>Fixed attacking when clicking on the buttons in the pause menu.</li>
  <li>Fixed the action progress bar not hiding when quitting.</li>
  <li>Fixed emotes rendering below certain obstacles.</li>
</ul>`
    },
    {
        date: 1694706686000,
        author: "HAZEL",
        title: "Back with a Bang",
        bannerImage: "./img/news/v0.10.0.png",
        content: `Despite the construction delays, we're back on the island to officially open the newest building: the refinery! Full of plenty of loot, but watch out or the whole place could go ka-boom...<br><br>

We're also happy to announce a large shipment containing 4 new types of guns, including two new DMRs! One gun is Italian, and three are American. Sources indicate the new LMG is particularly potent...<br><br>

Our scouts have fully mapped out the island, including its beaches. We've decided to begin adding name markers to the map to aid in navigation. You're welcome!`,
        longContent: `<h2>Suroi v0.10.0</h2>

<h3>New features & changes</h3>
<ul>
  <li>New building! Added the refinery, the largest structure yet!</li>
  <li>More guns! Added 4 guns: the Stoner 63 (a LMG), SR-25 (a DMR), ARX-160 (an assault rifle), and Mini-14 (a DMR).</li>
  <li>Rewrite! The game has been rewritten to use Pixi.js (a different rendering engine), and a custom physics engine, which should improve performance a lot.</li>
  <li>Better bullets! Bullets now reflect off of metal surfaces. Bullet collisions are now calculated client-side, making them more accurate.</li>
  <li>Beaches & ocean! The island is now surrounded by beaches and ocean.</li>
  <li>More & better particles! Players now emit particles when using healing items. Added bullet shell particles and muzzle flash. Obstacle hit particles now show in the correct locations.</li>
  <li>Better sounds! Sounds now play more reliably. Sound falloff has been added, meaning further away sounds are quieter, and a subtle stereo effect has been added.</li>
  <li>Place names! There are now named places on the map, like in surviv.io.</li>
  <li>Fixed an issue causing the game to freeze for a few seconds every round.</li>
  <li>New servers! The main, North America server has been upgraded from 2 cores and 2 GB RAM to 4 cores and 4 GB RAM. The Europe server has been upgraded to 4 cores and 8 GB RAM.</li>
  <li>Added 3 new skins and 1 emote.</li>
  <li>Made the warehouse and porta potty entrances more obvious. Added holes to the house roof.</li>
  <li>Your rank is now shown on the game over screen.</li>
  <li>Better hitboxes! Hitboxes and viewports have been fixed and adjusted.</li>
  <li>New pine tree texture.</li>
  <li>Added unique pickup sounds for healing items and scopes.</li>
  <li>Fixed issues with auto loot pickup on mobile.</li>
  <li>Fixed the force required to activate the right joystick not changing with joystick size.</li>
  <li>Added an option to loop when switching scopes, disabled by default.</li>
</ul>

Special thanks to Leia and platonthek. This update wouldn't have been possible without them.`
    },
    {
        date: 1690748181000,
        author: "HAZEL",
        title: "Behind Closed Doors",
        bannerImage: "./img/news/v0.9.0.png",
        content: `We at HAZEL are proud to announce the construction of 3 new structures on the island. The cozy house is a great place to spend the night…although you’ll want to leave before the gas catches you. The warehouse, though abandoned, still contains some unopened shipments, just waiting to be looted. Lastly, if you need to do some “business”, there are plenty of porta potties around for that purpose.<br><br>

There are also two new Austrian arrivals to the island. Like the Micro Uzi but want something that packs more of a punch? The Steyr AUG might be for you. If you prefer a challenge, grab the all-new full auto pistol, the CZ-75A.<br><br>

Surians can now customize their skins, and express themselves with emotes too! Everything is unlocked until accounts are added.`,
        longContent: `<h2>Suroi v0.9.0</h2>

<h3>New features & changes</h3>
<ul>
  <li>Buildings! Added 3 buildings: the house, the warehouse, and the porta potty.</li>
  <li>Skins & emotes! Added 22 skins and 59 emotes. All skins and emotes will be unlocked until accounts are added.</li>
  <li>More guns! Added 2 guns: the CZ-75A (a full auto pistol), and the AUG (an assault rifle). Also, the G19 is now semi-automatic.</li>
  <li>Tweaked gun and scope stats.</li>
  <li>Spectating! You can now spectate other players after you die. Also, a report system has been added, which will allow us to ban hackers.</li>
  <li>Games are now longer.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed an issue with the game getting stuck on "Connecting..." on older iOS devices.</li>
  <li>Fixed an issue causing the server to crash occasionally.</li>
</ul>`
    },
    {
        date: 1689622834000,
        author: "HAZEL",
        title: "Untrodden Lands",
        content: `H.A.Z.E.L. has made various improvements to weapons systems to refine them further, and a small shipment of antiquated arms has been received from Flint Industries. Scouts have explored more of the island. We've mapped out the gas release points, allowing us to predict the gas's movement accurately. Additionally, new AR software updates have been pushed out to ensure battle readiness.`,
        longContent: `<h2>Suroi v0.8.0</h2>

<h3>New features & changes</h3>
<ul>
  <li>Bigger map! The map is now bigger, and games are longer.</li>
  <li>More guns! Added 2 guns: the MP40 (an SMG), and the VSS (a DMR).</li>
  <li>Gun improvements! Guns now slow you down when holding, and spread is higher when moving. Gun icons have been simplified.</li>
  <li>Gas improvements! A white circle now appears on the map, showing where the gas will shrink to. Messages now appear when the gas is advancing, and gas death messages have been added.</li>
  <li>Lots of tweaks to gun stats and loot tables.</li>
  <li>New menu music!</li>
  <li>New obstacle! Added the blueberry bush.</li>
  <li>The secondary ammo counter now displays the total ammo in the inventory, instead of the gun clip size.</li>
  <li>The gold rock is no longer shown on the map.</li>
</ul>`
    },
    {
        date: 1688950260000,
        author: "HAZEL",
        title: "Geared Up",
        content: `A long-awaited shipment, containing helmets, vests, backpacks, and scopes, has finally arrived on the island! Pack in extra ammo with backpacks, protect yourself with helmets and vests, and get the jump on your enemy with scopes. Unfortunately, due to supply shortages, guns have become more scarce.`,
        longContent: `<h2>Suroi v0.7.0</h2>

<h3>New features & changes</h3>
<ul>
  <li>Equipment! Added helmets, vests, backpacks, and scopes.</li>
  <li>Replaced the 940 Pro with the HP18, a functionally identical gun which should be easier to distinguish from other shotguns.</li>
  <li>Added client-side prediction, which should make the game feel a lot more responsive. It can be turned off in settings.</li>
</ul>`
    },
    {
        date: 1688328459000,
        author: "HAZEL",
        title: "Tablets & Tweaks",
        content: `A new adrenaline item, tablets, can now be found! Tablets, along with all other healing items, can now be picked up and carried—but they no longer work instantly. Check out the Featured YouTubr and Streamr on the redesigned title screen! The kill feed and settings menu have also been redesigned. A golden object may drop a very powerful weapon...`,
        longContent: `<h2>Suroi v0.6.0</h2>

<h3>New features & changes</h3>
<ul>
  <li>Better healing items! Healing items can now be picked up, and take time to use. Added tablets, which heal 50% adrenaline.</li>
  <li>Better kill feed! Redesigned the kill feed. It now shows weapon icons instead of names.</li>
  <li>South America server! A 4th server, hosted in São Paulo, Brazil, is now available. To select it, click on the dropdown above the play button.</li>
  <li>Mobile improvements! Added auto loot pickup, and improved the UI.</li>
  <li>Better settings! The settings menu has been redesigned. Added options to change minimap and joystick transparency, and joystick size.</li>
  <li>The Lewis gun and Tango 51 are now more common. The MCX Spear is now less common.</li>
  <li>The Tango 51 now has a chance to drop from gold rocks.</li>
  <li>Buffed the 940 Pro.</li>
  <li>The gas has been nerfed slightly, and now shrinks completely.</li>
  <li>Added a background to the menu.</li>
  <li>Added Featured YouTubr and Streamr to the menu.</li>
  <li>Optimized minimap texture generation, which should improve load times on mobile.</li>
  <li>Minor tweaks to textures and sound effects.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed a bug causing reloading to break when picking up a gun.</li>
  <li>Fixed blood particles not appearing.</li>
  <li>Blood particles no longer appear when the player is damaged by gas.</li>
  <li>Fixed opaque obstacles on the minimap.</li>
</ul>`
    },
    {
        date: 1687625334000,
        author: "HAZEL",
        title: "Locked & Loaded",
        bannerImage: "./img/news/v0.5.0.png",
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
        bannerImage: "./img/news/v0.4.0.png",
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
        bannerImage: "./img/news/v0.3.0.png",
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
        bannerImage: "./img/news/v0.2.0.png",
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
        bannerImage: "./img/news/v0.1.0.png",
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
