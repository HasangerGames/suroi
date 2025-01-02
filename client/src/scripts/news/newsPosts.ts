import { type NewsPost } from "./newsHelper";

export const news: NewsPost[] = [
    {
        date: 1735793234000,
        author: "HAZEL",
        title: "Out With The Old",
        content: `Happy New Year! To celebrate, we're releasing the first of several overhaul updates for Suroi. The world sprite of every gun in the game has been replaced with high quality variants, and the length, art, and names of several weapons have been updated. Dual pistols have had their spread penalty removed. The game has also been switched to Harvest mode.<br><br>

        We're looking to address every aspect of the game going forward this year, including rebalances to adrenaline, armor, weapon damage, movement speed, the gas, reworked locations, and much more as we work towards the eventual full release of the game. `
    },
    {
        date: 1733881464000,
        author: "HAZEL",
        title: "Cold Steel",
        bannerImage: "../img/news/v0.22.0.png",
        content: `
        Winter has arrived on the island, bringing the festive spirit of the season and two new guns with it.
        <br><br>Normal mode now has a frosty reskin for all assets and new presents that drop weapons, many of which can be found arranged under an outdoor Christmas tree. The <strong>Ice Pick</strong> also makes a return along with a new high-value <strong>Frozen Crate</strong> to use it on, although bullets and certain other melee weapons will work... eventually.

        <br><br>Exclusive to Harvest, the <strong>BLR</strong> is a brand new uncommon <strong>5.56mm DMR</strong> with a 5 round magazine, high damage, and moderate overall stats that rewards careful aim instead of blind spam.
        <br><br>The <strong>RGS sniper rifle</strong> has replaced the CZ-600 in the Red Tugboat, boasting a <strong>ten round</strong> magazine and overall improved stats from its predecessor while being chambered in the same caliber but unable to be found anywhere else in Classic mode. In Harvest mode, it can also be found in airdrops, River and Viking crates, and the gun lockers.
        <br><br>The <strong>Lewis Gun</strong> has received a major overhaul, boasting a faster fire rate, decreased movement penalties, and a more fairly sized sprite to make it less of a pain in combat.

        <br><br>Weekly rotating modes will begin on <strong>Sunday, December 15th at 8PM EST</strong>. Mode rotations <strong>will be adjusted in the future as needed and in response to community feedback</strong>.
        `,
        longContent: `<h2>Suroi v0.22.0</h2>
<h3>New features</h3>
<ul>
  <li><strong>Winter map!</strong> A reskinned variant of Normal mode with snow covered buildings and obstacles.</li>
  <li><strong>New structure!</strong> Added the Christmas Camp, exclusive to the winter map.</li>
  <li><strong>New guns!</strong></li>
  <ul>
    <li>BLR: A high-damaging but low capacity DMR chambered in 5.56mm, exclusive to Harvest mode.</li>
    <li>RGS: A sniper rifle chambered in 5.56mm, featuring a high capacity and fire rate.</li>
  </ul>
  <li><strong>New melee!</strong> Added the Ice Pick, exclusive to the winter map.</li>
  <li>New layout variants for the Warehouse and Blue House vault.</li>
  <li>Added Light Choco skin, exclusive to airdrops on the winter map.</li>
</ul>

<h3>Changes</h3>
<ul>
  <li>The Lewis Gun has been rebalanced with higher damage (16 -> 16.5), lower fire delay (120 -> 115), and reduced speed penalty (0.65x -> 0.7x) at the cost of a reduced obstacle multiplier (2.5 -> 2).</li>
  <li>Decreased Vector damage (10 -> 9).</li>
  <li>Updated the loot images of the Tango 51, CZ-75A, Flues, Mini-14, Mosin-Nagant, Model 37, HP-18, and M16A4.</li>
  <li>Updated Model 37 world image.</li>
  <li>The CZ-600 is now more common on the Normal map and has been removed from airdrops.</li>
  <li>Added cooldown for emotes and team pings, preventing spamming.</li>
  <li>Removed most of the large trees on the Normal map.</li>
  <li>Renamed the VSS to VSS Vintorez, and the PP-19 to PP-19 Vityaz.</li>
  <li>Adjusted birch tree sprite.</li>
  <li>New sickle swing animation.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed issues with ceiling visibility in the armory vault.</li>
  <li>Fixed incorrectly scaled item request emotes.</li>
  <li>Fixed the rotations of the two dumpsters in the port.</li>
  <li>Fixed oversized DEagle world image.</li>
  <li>Fixed Z index issue with the couches in the headquarters.</li>
</ul>`
    },
    {
        date: 1731370468000,
        author: "HAZEL",
        title: "Empty Baskets",
        content: `Harvest comes to a close and Classic mode returns to the island, but more is soon to come. We will be holding a <strong>closed beta test for accounts</strong> in the not-so-distant future, so stay tuned to official Suroi channels for information on how to participate.

<br><a href="/rules">The rules</a> have been updated. Please take the time to read them.`
    },
    {
        date: 1730689557000,
        author: "HAZEL",
        title: "Autumn Wilt",
        content: "The spooky season comes to a close, and the Plumpkins have died off. We hoped you enjoyed this year's Halloween mode, and will be taking your feedback into account for future events. Harvest will continue until <strong>November 11th</strong>, but will return in future as a rotating mode."
    },
    {
        date: 1730428409000,
        author: "HAZEL",
        title: "Plumpkin Panic",
        bannerImage: "../img/news/v0.21.0.png",
        content: `<strong>Happy Halloween!</strong> It's that time of year again, and the Plumpkins have broken out of the bunker, leaving the island covered in brand new perk opportunities. The Harvest map has been changed to fit the festivities, with a delightfully spooky theme.

<br><br>For a limited time, <strong>13 brand new Halloween exclusive perks</strong> will be available to pick up alongside the normal perks. There's no need to choose between one or the other: You can have one of each!

<br><br>Halloween will run for <strong>3 days</strong>, until 8 PM EST, Nov 3rd.`,
        longContent: `<h2>Suroi v0.21.0</h2>
<h3>New features</h3>
<ul>
<li><strong>Halloween mode!</strong> A variant of Harvest mode with some spooky goodies.</li>
<li><strong>More perks!</strong> Added 13 Halloween-exclusive perks.</li>
</ul>

<h3>Changes</h3>
<ul>
<li>Buffed Model 89 and DT-11.</li>
<li>Slight tweaks to SKS sprites.</li>
<li>Fixed team pings rendering below airdrop parachutes.</li>
  </ul>`
    },
    {
        date: 1730057509000,
        author: "HAZEL",
        title: "Open Season",
        bannerImage: "../img/news/v0.20.0.png",
        content: `Fall settles on a brand new mode, <strong>Harvest</strong>, bringing a plethora of <strong>new guns</strong>, a wide assortment of <strong>Perks</strong>, and the mysterious <strong>Plumpkins...</strong>

<br><br>Harvest is a large map filled with new trees, trails, and brand new ambient sounds and particles, as well as a bounty of new structures, including the <strong>Barns</strong>, old farming relics with plenty of cover, and the <strong>Lodge</strong>, a luxurious forest getaway with more than meets the eye...

<br><br>Deep underground, the <strong>Plumpkin Bunker</strong> has been uncovered. This monument of engineering and science contains everything from a fully stocked guard's quarters, to a warehouse, generator room, and the main labs themselves. Rumors have it that the experiments sealed inside the test chambers are highly enigmatic, but <strong>richly rewarding</strong> to anyone fortunate enough to lay hands on them. One of the samples seems to be sealed off... <strong>for now.</strong>

<br><br>Recent documents have revealed the <strong>Bombed Armory</strong>, containing the returning fan-favorite <strong>USAS-12</strong> sealed inside the vault, although getting inside might take a more <strong>brute force</strong> approach this time.

<br><br>Brand new weapon shipments to both Harvest and Normal mode include the <strong>SKS</strong>, a reliable and common DMR chambered in 7.62, although it leaves something to be desired in damage. The <strong>VKS Vykhlop</strong> has that more than covered, firing high damage suppressed .50 cal rounds at a low velocity. Finally, the monstrous <strong>Mk-18 Mjölnir</strong>, chambered in .338 Lapua Magnum, will rip through any competition with an impressive mixture of immense damage and fast fire rate.

<br><br>Unique to Harvest mode are two brand new shotguns, the <strong>DT-11</strong>, an under-over double barrel shotgun with longer range and lower damage compared to its sawed-off counterpart, and the <strong>M590M</strong>, a military pump-action shotgun firing high-explosive slugs.

<br><br>There's much more to check out, including new skins, a variety of small structures, brand new foliage, and changes yet to come.
        `,
        longContent: `<h2>Suroi v0.20.0</h2>
<h3>New features</h3>
<ul>
  <li><strong>Harvest mode!</strong> A larger, fall-themed map with terrain features.</li>
  <li><strong>Perks!</strong> Added 12 perks.</li>
  <li><strong>New structures!</strong> Added the Plumpkin Bunker, Lodge, Barn, Bombed Armory, Tents, Outhouses, and Hay Sheds.</li>
  <li><strong>New guns!</strong></li>
  <ul>
    <li>SKS: A DMR chambered in 7.62mm.</li>
    <li>VKS Vykhlop: A suppressed sniper chambered in .50 Cal.</li>
    <li>Mk-18 Mjölnir: A powerful DMR chambered in .338 Lapua Magnum.</li>
    <li>DT-11: A double-barrel shotgun. Exclusive to Harvest mode.</li>
    <li>M590M: A pump-action shotgun which fires high explosive rounds, similar to the USAS-12. Also exclusive to Harvest mode.</li>
  </ul>
</ul>

<h3>Changes</h3>
<ul>
  <li>Overhaul to matchmaking algorithm. This should reduce late spawning and improve server performance.</li>
  <ul>
    <li>Reduced max players per game to 60.</li>
  </ul>
  <li>Nerfed grenade boosting.</li>
  <li>Ammo crates now drop 2-3 pieces of ammo.</li>
  <li>The Model 89 is now more common in normal mode.</li>
  <li>Increased M1 Garand damage from 39 to 48.</li>
  <li>Increased SR-25 damage from 28.5 to 33.</li>
  <li>New AK-47, M16A4, and Vector sounds.</li>
  <li>New Flues and G19 fire sounds.</li>
  <li>Fixed bullets not damaging bushes and tables.</li>
  <li>Fixed occasional “Error joining game” issues.</li>
</ul>`
    },
    {
        date: 1727030995000,
        author: "HAZEL",
        title: "High-Caliber Negotiations",
        bannerImage: "../img/news/v0.19.0.png",
        content: `
          Good old-fashioned bureaucracy has made its way to the island with this update, alongside an overhaul of the highest tiers of ammo, two new melee weapons, and three new guns with impressive firepower.
          <br><br>Front and center, the massive <strong>AEGIS Headquarters</strong> has recently been completed. This titan of industry features two separate floors, a security office with an attached armory, a cafeteria, a boardroom, an executive office and lounge, and plenty of loot to make it worth your while. Rumor has it that the CEO even keeps a personal vault hidden somewhere in the building...
          <br><br>Two new handguns have been added: the <strong>DEagle</strong> and the <strong>RSh-12</strong>, both chambered in <strong>.50 Cal</strong>. The DEagle offers solid damage, high DPS, and a fair magazine size all in a compact package. On the other hand, the RSh-12 brings the term 'assault revolver' to life with <strong>powerful First Shot Accurate rounds</strong>, though it has low range and magazine capacity.
          <br><br>Due to a supply shortage, the Barrett M95 <strong>is no longer available</strong>. However, fear not; we've found an even more suitable replacement. The <strong>L115A1</strong>, chambered in <strong>the elusive .338 Lapua Magnum</strong>, is sure to turn heads (and pop them just as easily). Like its predecessor, the L115A1 is more than capable of engaging any opponent, regardless of armor.
          <br><br>There's much more to explore, including the <strong>Fire Hatchet</strong> and <strong>Falchion</strong> melees, overhauled Cargo Ship and Oil Tanker, brand new <strong>Blue House</strong>, and a few surprises coming in the near future.
        `,
        longContent: `<h2>Suroi v0.19.0</h2>
<h3>New features</h3>
<ul>
  <li><strong>Multi-story buildings!</strong></li>
  <ul>
    <li>Added the AEGIS headquarters, the first building with two floors.</li>
    <li>Added a small bunker, the first structure with a basement.</li>
    <li>Added the blue house, a small house similar to the red and green houses.</li>
    <li>Added a second variant of the red house.</li>
  </ul>
  <li><strong>New guns!</strong></li>
  <ul>
    <li>Added the DEagle 50, a semi-automatic pistol chambered in .50 Cal, found in the headquarters.</li>
    <li>Added the RSh-12, a suppressed, first shot accurate revolver also chambered in .50 Cal, also found in the headquarters.</li>
    <li>Replaced the Barrett M95 with the L115A1, a powerful sniper chambered in .338 Lapua Magnum, found in golden airdrops and the Flint stone.</li>
  </ul>
  <li><strong>New melee weapons!</strong></li>
  <ul>
    <li>Added the falchion, a one-handed sword found in the headquarters.</li>
    <li>Added the fire hatchet, a stronger version of the hatchet found on oil tanker ships.</li>
  </ul>
  <li><strong>New throwable!</strong> Added C4, a new type of explosive which can be remotely detonated.</li>
  <li><strong>Redesigned structures!</strong> Redesigned the cargo ship, the oil tanker ship, and the mobile home.</li>
  <li><strong>Squads!</strong> Squads have been added to the mode rotation.</li>
  <li>The Mosin's clip can now be fully reloaded when empty.</li>
  <li>Added 3 new building exclusive skins: Gold Tie Event (headquarters only), Ship Carrier (oil tanker ship only), and NSD Uniform (armory only).</li>
  <li>Added 3 new emotes.</li>
</ul>

<h3>Changes</h3>
<ul>
  <li>Games are now longer.</li>
  <li>The gas now does more damage the further you are from the center of the safe zone.</li>
  <li>Nerfed M16A4.</li>
  <li>Buffed CZ-75A, HP-18, and G19.</li>
  <li>Grenade physics is now more consistent.</li>
  <li>Optimized input code to reduce input lag.</li>
  <li>Various performance improvements.</li>
  <li>Improved translations.</li>
  <li>Tweaked ammo UI.</li>
  <li>Redesigned spectating UI on mobile.</li>
  <li>Skins in loot form are now rendered with fists.</li>
  <li>Changed sounds for several guns.</li>
  <li>New switch sounds for melee weapons.</li>
  <li>New sounds for indestructible metal objects.</li>
  <li>Added an ambient sound to the port.</li>
  <li>New airdrop crate texture.</li>
  <li>New gun case texture.</li>
  <li>Tweaked crane texture.</li>
  <li>Tweaked barrel and super barrel textures.</li>
  <li>Improved residues for river obstacles.</li>
  <li>Added trash cans to the armory, shed, and green house.</li>
  <li>Added a dumpster to the port.</li>
  <li>Added colored particles for containers and the crane.</li>
  <li>Small tweaks to physics when loot is dropped or can't be picked up.</li>
  <li>Social links now open in a new tab, and are unclickable for 1.5 seconds after disconnecting from a game, to prevent accidental clicks.</li>
  <li>Tweaked angry face emote.</li>
  <li>Tweaked Model 89 textures.</li>
  <li>Tweaked port and armory fences.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed explosions doing damage through walls.</li>
  <li>Fixed melee doing damage through walls.</li>
  <li>Fixed issues with spectating.</li>
  <li>Fixed dropping throwables causing slot switch.</li>
  <li>Fixed issues with health bar animation.</li>
  <li>Fixed building ceilings flickering.</li>
  <li>Fixed control panel health resetting when used.</li>
  <li>Fixed tinting of ghillie suit fists in the inventory.</li>
</ul><br>
Special thanks to pap, Solstice, platonthek, eiπ, and the other devs for their outstanding work on this update!`
    },
    {
        date: 1717870665000,
        author: "HAZEL",
        title: "Back in the Saddle",
        bannerImage: "../img/news/v0.18.0.png",
        content: `After a long break, we're back with some important updates and fun changes. Although we're late, we're celebrating Suroi's 1 year birthday with some new items, and even more exciting, limited edition squads.<br><br>

    A revamped moderation system is here to combat those cheater pests with improved efficiency. Say hello to our new Game Moderatrs on Discord!<br><br>

    There's also a new structure, the large bridge. While huge in proportion, it offers plenty of cover and close quarter combat. It's also a perfect spot to set up your squad in a defensive position!<br><br>

    Lots of changes and bug fixes have made it into this update, so check out the full log. Thank you everyone for sticking with us!`,
        longContent: `<h2>Suroi v0.18.0</h2>
<h3>New features</h3>
<ul>
  <li><strong>Squads!</strong> To celebrate Suroi's 1st birthday, squads will be available for the next week only. They will be back once we have enough players.</li>
  <li><strong>New structures!</strong> Added the large bridge and the construction site.</li>
  <li><strong>Birthday exclusive items!</strong> Added the birthday cake skin and obstacle, firework launcher, confetti grenade, and firework warehouse. Like squads, they will be available for the next week only.</li>
  <li><strong>Better moderation system!</strong> We now have a dedicated team of Game Moderatrs. They will manage #cheatr-reports using a new Discord bot.</li>
  <ul>
    <li>In the future, we are planning on moving to a more self-contained report system that doesn't rely on Discord.</li>
  </ul>
  <li>Added a new skin and 5 new emotes.</li>
  <li>Added crawling animation for knocked out players.</li>
  <li>Added inventory slot animations.</li>
  <li>Added emote categories.</li>
</ul>

<h3>Changes</h3>
<ul>
  <li>New Mosin top down.</li>
  <li>New ammo crate, forklift, pallet, couch, and life preserver textures.</li>
  <li>Improved mobile and spectate controls.</li>
  <li>Improved loot physics.</li>
  <li>Badges now display next to names when spectating.</li>
  <li>Adjusted the length of some reload sounds.</li>
  <li>Changed the way updates from the server are handled, which should improve smoothness.</li>
  <li>Added LMGs to briefcase loot table.</li>
  <li>Adjusted pine tree hitbox.</li>
  <li>The kill feed is now hidden when the map is open.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed issues with team pings.</li>
  <li>Fixed badges.</li>
  <li>Fixed infinite health by spamming healing items while knocked out.</li>
  <li>Fixed team emotes working in solo.</li>
  <li>Fixed players not rendering correctly after being revived.</li>
  <li>Fixed drop sound not playing when dropping weapons with fists equipped.</li>
</ul>`
    },
    {
        date: 1711917946000,
        author: "HAZEL",
        title: "Just the Two of Us",
        bannerImage: "../img/news/v0.17.0.png",
        content: `Much requested. Long awaited. Duos mode is here! Grab a friend and battle towards that tasty chicken dinner! Either queue with a random or send a custom link to someone. If you'd like to voice chat, join the <a href="https://discord.suroi.io" target="_blank">Discord server</a>. You could even use one of 3 new LMGs we've added to help you out…<br><br>

The MG36 is for those who like assault rifles like the AK-47 but find themselves needing that little extra “oomph”. The lightness of an AR combined with the hard hitting obstacle multiplier of a LMG. Give it a try!<br><br>

Our first true heavy hitter, the MG5, won't disappoint with 120 rounds of high damaging 7.62mm. Use its accuracy to punish your opponents at long range.<br><br>

If the MG5 was peanut butter, the Negev is the jelly. 200 rounds of fast firing 5.56mm will leave your opponents scrambling for cover! Just make sure to get close enough to compensate for the accuracy.<br><br>

There's so much to check out in this update, like new buildings, retextures, and performance improvements. Good luck!`,
        longContent: `<h2>Suroi v0.17.0</h2>
<h3>New features</h3>
  <ul>
  <li><strong>Duos!</strong> You can now play Suroi in teams of two.</li>
  <ul>
    <li>Duos only for the next week; starting in the next update, the game will switch between and solos and duos every 24 hours.</li>
    <li>Ammo, healing items, equipment, and scopes are now droppable, but only in duos. Items aren't droppable on mobile yet.</li>
    <li>To request an item from your teammate, hold the keybind for the team ping wheel (default C), and click on the item you want.</li>
  </ul>
  <li><strong>3 new guns!</strong> Added 3 LMGs: the MG5, Negev, and MG36.</li>
  <li><strong>New structure!</strong> Added the green house.</li>
  <li>Added 7 new skins and 2 new emotes.</li>
  <li>Added option to disable emotes.</li>
</ul>

<h3>Changes</h3>
<ul>
  <li>Redesigned red house.</li>
  <li>Doubled gas damage.</li>
  <li>New melee weapon textures.</li>
  <li>New radio texture.</li>
  <li>Added ground loot to buildings.</li>
  <li>New melee crate texture.</li>
  <li>Ammo crates now drop 10 12.7mm ammo instead of 1.</li>
  <li>Small improvements to various textures.</li>
  <li>Various performance optimizations.</li>
  <li>New wiki icon on menu.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed items glitching through porta potty and refinery walls.</li>
  <li>Fixed the port spawning on top of rivers.</li>
  <li>Fixed clicking on players to spectate them.</li>
  <li>Fixed off center number in action countdown.</li>
</ul>`
    },
    {
        date: 1708892369000,
        author: "HAZEL",
        title: "A Sailor's Dream",
        bannerImage: "../img/news/v0.16.0.png",
        content: `We're back with new guns, structures, and more for ye landlubbers to check out! Two new powerful weapons are available in golden airdrops, and a new sniper has joined the ranks. Where do you find it? Why, in the captain's tugboat, of course! The soggy pants will be worth it.<br><br>

Lily pads, river crates, bridges, and more are making an appearance this update, as well as a multitude of changes and bug fixes to make your experience better. Duos are coming in the next update, so stay tuned!`,
        longContent: `<h2>Suroi v0.16.0</h2>
<h3>New features</h3>
<ul>
  <li>New structures: tugboat, sea traffic control, bridges.</li>
  <li>New guns: Model 89 (a DMR), CZ-600 (a sniper), and PP-19 (a suppressed SMG).</li>
  <li>New crate: river crate.</li>
  <li>New obstacles: lily pads.</li>
  <li>New crate: grenade box. Sometimes spawns in place of boxes in the warehouse.</li>
  <li>Added win and death emotes.</li>
  <li>New skin: Distant Shores.</li>
  <li>Added a loading screen.</li>
</ul>

<h3>Changes</h3>
<ul>
  <li>Scope is now reduced to 1x inside of smoke.</li>
  <li>Added quit button to spectate menu.</li>
  <li>Nerfed HP18.</li>
  <li>Added 12.7mm and Curadell (radio ammo) to ammo crates.</li>
  <li>Made rivers slightly narrower.</li>
  <li>Added a strap to the M1 Garand loot image, to make it easier to tell apart from the Mosin.</li>
  <li>New Curadell loot image.</li>
  <li>Improved mobile home and porta potty footstep hitboxes.</li>
  <li>Removed Fireball and Blueberry Smoothie skins.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed grenades sometimes going to the right on mobile regardless of joystick position.</li>
  <li>Fixed not being able to cycle throwables by clicking/tapping on the slot.</li>
  <li>Fixed aim line not showing up on mobile.</li>
</ul>`
    },
    {
        date: 1705262400000,
        author: "HAZEL",
        title: "Pulling the Pin",
        bannerImage: "../img/news/v0.15.0.png",
        content: `Yank a pin out, cook the 'nade, and toss it to blow your enemy sky high! The throwables update is here and brings a plethora of new features and content the game.<br><br>

First and foremost: throwables. Punch a grenade box, scattered around the map, to find frag and smoke grenades. Frags have a timed fuse and produce a powerful explosion, while smokes can provide cover to hide from enemies.<br><br>

Two new powerful weapons have made it ashore in this update: the Vepr-12 and the Vector. The Vector is incredibly strong, but burns through ammo fast. Similarly, the Vepr-12 will send opponents running, but keep an eye on your 12-gauge ammo reserves.<br><br>

The first new building (in a while!) also makes its debut. The armory is a bastion of strength for the island, and the weapons and density of loot live up to that. Explore the office, bunkhouse, APC, and the vault, which contains powerful loot.<br><br>

There are a bunch more new features to check out, such as a new port layout (including an oil tanker!), mobile home, Viking chests, the seax, maul, and major UI changes. Stay survivn'!`,
        longContent: `<h2>Suroi v0.15.0</h2>
<h3>New features</h3>
<ul>
  <li><strong>Throwables!</strong> Added frag grenades and smoke grenades. Other throwables, like mines and MIRV equivalents, will be added in a future update.</li>
  <li><strong>New structures!</strong> Added the armory and mobile home.</li>
  <li><strong>New guns!</strong> Added the Vector (an SMG), and the Vepr-12 (a full auto shotgun; equivalent to surviv's Saiga-12).</li>
  <li><strong>Updated port!</strong> The port is now smaller, and a new type of ship, the oil tanker, has a 50% chance of spawning in place of the normal ship.</li>
  <li><strong>New melees!</strong> Added the maul (a heavy hammer), and the seax (a Viking dagger).</li>
  <li><strong>New UI layout!</strong> The UI has been overhauled.</li>
  <li>Added river rocks.</li>
  <li>Redesigned 2 skins, and added 6 new ones, 1 of which is airdrop exclusive.</li>
</ul>

<h3>Changes</h3>
<ul>
  <li>Winter mode is over.</li>
  <li>Increased movement speed slightly, to match surviv.</li>
  <li>Increased tick rate.</li>
  <li>The flint stone no longer drops healing items.</li>
  <li>Adjusted melee weapon stats.</li>
  <li>Adjusted obstacle multipliers for explosions.</li>
  <li>Smoke now spawns when airdrops land.</li>
  <li>The fists icon now changes with the equipped skin.</li>
  <li>New airdrop ping sound.</li>
  <li>New dry fire sound.</li>
</ul>`
    },
    {
        date: 1702328915000,
        author: "HAZEL",
        title: "Double Trouble",
        bannerImage: "../img/news/v0.14.0.png",
        content: `The weather grows cold, the trees lose their leaves, and the snowdrifts pile high. But we've got a couple new features to spice up the winter season! The entire map has been reskinned to frosty perfection, with more surprises in store soon! Also, we've added the long-awaited dual-wielding feature for pistols—if one isn't enough, grab another for twice the firepower!<br><br>

Of course, we've made a few changes and fixes, including a circular action timer, reworked airdrops, and a larger map grid. Go warm yourself up with a toasty chicken dinner!`,
        longContent: `<h2>Suroi v0.14.0</h2>
<h3>New features</h3>
<ul>
  <li><strong>Winter mode!</strong> Just a reskin for now. More content coming soon.</li>
  <li><strong>Dual wielding!</strong> You can now dual wield pistols.</li>
  <li>You can now cancel actions on mobile.</li>
  <li>Added 2 emotes.</li>
  <li>Added keybind to toggle UI.</li>
</ul>

<h3>Changes</h3>
<ul>
  <li><strong>Better rivers!</strong> River generation has been improved further. Rivers are now smoother, and loot flows down them.</li>
  <li><strong>Circular action timer!</strong> A circular timer is now displayed when reloading/using healing items.</li>
  <li>Adjusted lobby timings. Players are now prevented from joining earlier on more active servers, and later on less active ones.</li>
  <li>Connected separated building walls.</li>
  <li>Increased map grid size.</li>
  <li>Decreased Model 37 fire and switch delays to 900 ms.</li>
  <li>Switched from howler.js to Pixi sound, which should improve loading times significantly.</li>
  <li>Server performance improvements.</li>
  <li>Improved ship hitbox.</li>
  <li>Improved player count calculation code, which should make player counts more accurate.</li>
  <li>New airdrop killfeed icon.</li>
  <li>New helmet pickup sound.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed airdrops spawning in the gas.</li>
  <li>Fixed airdrop pings not showing up sometimes.</li>
  <li>Fixed picking up skins on mobile.</li>
  <li>Fixed being able to see inside the ship vault without opening the door.</li>
  <li>Fixed generator interact message saying "Open Generator" instead of "Activate Generator."</li>
</ul>`
    },
    {
        date: 1701085392000,
        author: "HAZEL",
        title: "Terminal Velocity",
        bannerImage: "../img/news/v0.13.0.png",
        content: `Expect routine supply shipments from the A.E.G.I.S. aeronautical division, complete with everything you need to win a savory chicken dinner! Or, notify them directly by using a radio to get your own personal airdrop. If you're lucky, you'll get one of the 3 new and very powerful guns!<br><br>

Erosion has worked its magic on the island, and rivers look much cleaner than they ever have before. We've made a whole host of changes and bug fixes, including better mobile layout and building visibility. Get out there, these airdrops are comin' in hot!`,
        longContent: `<h2>Suroi v0.13.0</h2>
<h3>New features</h3>
<ul>
  <li>Airdrops! Two airdrops now spawn every game. They can also be called with radios, which are a rare drop from crates.</li>
  <li>More guns! Added 3 guns, which spawn only in airdrops: the Barrett M95 (a sniper rifle; equivalent to surviv.io's AWM-S), the M1 Garand (a DMR), and the ACR (an assault rifle; equivalent to surviv.io's M4A1-S).</li>
  <li>More skins! Added 3 airdrop exclusive skins, including the Ghillie Suit.</li>
</ul>

<h3>Changes</h3>
<ul>
  <li>Tweaked loot tables. Higher level equipment and powerful weapons are now much rarer.</li>
  <li>Better building visibility! You can now see inside buildings from further away, and through open doors.</li>
  <li>Better river generation! Rivers can now branch, and the ends meet the ocean more cleanly.</li>
  <li>Mobile layout improvements.</li>
  <li>Migrated from Webpack to Vite.</li>
  <li>The Stoner 63 now has a 1 in 100 chance of spawning in the refinery.</li>
  <li>Rebalanced some guns.</li>
  <li>Added unique pickup sounds for helmets, vests, and packs.</li>
  <li>Tweaked kill feed icons.</li>
  <li>New M1895 switch sound.</li>
  <li>Updated MP40 reload sound.</li>
  <li>Obstacles now play only one hit sound at once.</li>
  <li>2 blocks of ammo are now dropped along with guns, instead of 1.</li>
  <li>Increased maximum size of ammo stacks dropped by dead players.</li>
  <li>Disallowed extended ASCII characters in usernames.</li>
</ul>

<h3>Bug fixes</h3>
<ul>
  <li>Fixed the gas always shrinking to the center of the map.</li>
  <li>Fixed barrel smoke particles not showing.</li>
  <li>Fixed door hitbox issues.</li>
  <li>Fixed used toilets never spawning in the house.</li>
  <li>Fixed "Connection lost" issue when spectating a winning player.</li>
  <li>Fixed spectate options not hiding when fullscreen map is shown.</li>
  <li>Fixed players being promoted to kill leader after death.</li>
</ul>`
    },
    {
        date: 1698602400000,
        author: "HAZEL",
        title: "Trick-or-Tweak",
        bannerImage: "../img/news/v0.12.0.png",
        content: `The island grows dark. The trees begin to turn, the rivers run red, and the full moon rises. A new spooky orange obstacle drops one of two new weapons: a training weapon from A.E.G.I.S. stores, and a very powerful shotgun specially modified by H.A.Z.E.L.'s R&D team.<br><br>

After checking out these frightening additions, enjoy your candy while reading all the bug fixes and QoL changes this update brings. Happy Halloween!`,
        longContent: `<h2>Suroi v0.12.0</h2>
<h3>Changelog</h3>
<ul>
  <li>Halloween mode! Added 2 new guns and a new obstacle. Reskinned trees & blueberry bushes. New menu music.</li>
  <li>Added a new skin and a new emote.</li>
  <li>Added 7 new crosshairs.</li>
  <li>Tweaked gun top downs.</li>
  <li>New reload & switch sounds for Flues & M1895.</li>
  <li>Fixed "Connection lost" issues.</li>
  <li>Fixed "Error joining game" issues.</li>
  <li>Fixed an issue with the camera being stuck in the top left corner when movement smoothing is disabled.</li>
  <li>Fixed issues with the Play Again button.</li>
  <li>Fixed birch and pine trees spawning inside other obstacles.</li>
  <li>Fixed kill leader issues.</li>
  <li>Server performance improvements.</li>
  <li>The AEGIS crate now has a 50% chance to spawn in place of the Tango crate in the ship vault.</li>
  <li>Scopes now drop from the Tango crate.</li>
  <li>Fixed issues with shoot on joystick release.</li>
  <li>Fixed the rules & tutorial button being hidden by default.</li>
  <li>Removed misleading ping counter from server selector.</li>
  <li>Fixed overlapping containers at the port.</li>
  <li>Fixed issues with special characters in usernames.</li>
  <li>Fixed kill feed messages not being colored.</li>
  <li>Fixed movement keys not working to switch spectators.</li>
  <li>Fixed rivers below the port slowing players down.</li>
  <li>Fixed keybind reset button.</li>
  <li>Fixed "Equip Other Gun" keybind not switching to secondary slot with only 1 gun equipped and melee slot selected.</li>
  <li>Fixed minimap rendering issues.</li>
  <li>Fixed container layering issues.</li>
  <li>The inside of the captain's cabin on the ship is now revealed when near the windows.</li>
  <li>Added missing killfeed icons.</li>
  <li>Fixed some missing textures.</li>
  <li>Fixed silent porta potty doors.</li>
  <li>Fixed images on the news page not loading.</li>
  <li>The M1895 now displays bullet casings only on reload. The M1895 and Flues now display multiple casings.</li>
  <li>Removed default keybind for opening the dev console.</li>
</ul>`
    },
    {
        date: 1698001957000,
        author: "HAZEL",
        title: "Making Waves",
        bannerImage: "../img/news/v0.11.0.png",
        content: `The island grows ever busier with the newest structure, the port. Search the warehouses and shipping containers for loot, 'cause they're packed! Containers can also be found throughout the island. But the most valuable loot is contained in the bow of the massive container ship. A highly prized sniper lies within, but you'll need to solve a puzzle to get in.<br><br>

If you like swimming, you're in luck! Rivers now snake through the landscape, and the ocean is now accessible.<br><br>

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
        bannerImage: "../img/news/v0.10.0.png",
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
        bannerImage: "../img/news/v0.9.0.png",
        content: `We at HAZEL are proud to announce the construction of 3 new structures on the island. The cozy house is a great place to spend the night…although you'll want to leave before the gas catches you. The warehouse, though abandoned, still contains some unopened shipments, just waiting to be looted. Lastly, if you need to do some “business”, there are plenty of porta potties around for that purpose.<br><br>

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
        content: "H.A.Z.E.L. has made various improvements to weapons systems to refine them further, and a small shipment of antiquated arms has been received from Flint Industries. Scouts have explored more of the island. We've mapped out the gas release points, allowing us to predict the gas's movement accurately. Additionally, new AR software updates have been pushed out to ensure battle readiness.",
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
        content: "A long-awaited shipment, containing helmets, vests, backpacks, and scopes, has finally arrived on the island! Pack in extra ammo with backpacks, protect yourself with helmets and vests, and get the jump on your enemy with scopes. Unfortunately, due to supply shortages, guns have become more scarce.",
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
        content: "A new adrenaline item, tablets, can now be found! Tablets, along with all other healing items, can now be picked up and carried—but they no longer work instantly. Check out the Featured YouTubr and Streamr on the redesigned title screen! The kill feed and settings menu have also been redesigned. A golden object may drop a very powerful weapon...",
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
        bannerImage: "../img/news/v0.5.0.png",
        content: "The newest supply shipment to the island has arrived, along with a slew of new weapons! Blast enemies all day long with the 47 round pan on the Lewis gun, or test your marksmanship with the Tango 51. Prefer hand-to-hand combat? The K-bar or the baseball bat may be for you. A glint of gold may yield a fruitful surprise...",
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
        bannerImage: "../img/news/v0.4.0.png",
        content: "We have received the new arms and supply shipment from Mr. Flint. In the crates were all four weapons promised: the Mosin-Nagant, Ithaca Model 37, SAF-200, and Glock 19. These should help us dramatically, as we were in great need of additional and varied firepower. Additionally, the new medical items, gauze, colas, and medikits, will allow better treatment of injuries. However, they were not of the portable variety we requested, and we hope to resolve this soon.",
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
        title: "Doublet State",
        bannerImage: "../img/news/v0.3.0.png",
        content: "A mysterious orange gas is now being reported around the island. We collected a sample and were able to convert it to a solid at -9.3°C, but found it to be very toxic. You've been warned! In other news, if you're the last one on the island left, you'll get your very own chicken dinner courtesy of HAZEL, the perfect meal to enjoy your victory!",
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
        bannerImage: "../img/news/v0.2.0.png",
        content: "This week's update introduces guns, health crates, and keybinds! There are only 2 guns for now: the AK-47 and the M3K. More will be added soon.<br>If you're having issues with textures, try <a href=\"https://its.uiowa.edu/support/article/719\">clearing your cache.</a>",
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
        bannerImage: "../img/news/v0.1.0.png",
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
