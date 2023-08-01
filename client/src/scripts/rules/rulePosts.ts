/* eslint-disable quotes,@typescript-eslint/quotes */
export interface RulesPost {
    date: number
    author: string
    title: string
    bannerImage?: string
    content: string
    longContent?: string
}

export const rules: RulesPost[] = [
    {
        date: 1690908230000,
        author: "Katloo",
        title: "Rules",
        content: `By playing Suroi, you agree to abide to the following rules. If you do not follow these rules, you may be banned for breaking them.`,
        longContent: 
`<ul>
  <li>No hacking. The use of scripts, plugins, extenstions, etc. to modify the game in order to gain an advantage over opponents is strictly forbidden.</li>
  <li>No teaming in solo. Allying with other solo players for extended periods of time is against the rules.</li>
  <li>No inappropriate usernames. We are very lenient on our blocklists, but some things are still blocked. Trying to evade filters for these specific words may incur consequences.</li>
</ul>`
    },
    {
        date: 1690908230000,
        author: "Katloo",
        title: "Tutorial",
        content: `If you're a new player, check out this tutorial to learn how to play!`,
        longContent: `<h2>Controls</h2>
<p>Movement - W, A, S, D</p>
<p>Aim - Mouse</p>
<p>Melee/Shoot - Left-Click</p>
<p>Change Weapons - 1 through 3 or Scroll Wheel</p>
<p>Stow Weapons/Melee - 3</p>
<p>Equip Last Item - Q</p>
<p>Swap Gun Slots - T</p>
<p>Reload - R</p>
<p>Aim - Mouse</p>
<p>Change Scope Zoom - Left-Click on Scope</p>
<p>Aim - Mouse</p>
<p>Pickup/Loot/Interact - F</p>
<p>Aim - Mouse</p>
<p>Use Medical Item - Left-Click on item or 5 through 8</p>
<p>Drop Item - Right-Click on item</p>
<p>Cancel Action - X</p>
<p>Toggle Fullscreen Map - M or G</p>
<p>Toggle Minimap - Mouse</p>
<p>Use Emote Wheel - Hold Right-Click, drag, and release</p>

<h3>Keybinds can be changed in settings!</h3>

<h2>How to Play</h2>
<p>The goal of Suroi is to be the last player standing. You'll start with nothing, so move around the map to get weapons, scopes, armor, healing items, and ammo. If you see another player, eliminate them for their loot!</p>

<h2>Orange = Bad</h2>
<p>You have another enemy to watch out for: a deadly orange gas. As the games progresses the gas will expand, making the safe zone smaller and smaller. The damage increases each time it shrinks.</p>

<h2>Similar Games</h2>
<p>If you have played games like PUBG, Fortnite, and Apex Legends or other browser battle royales like surviv.io and zombsroyale.io, you might be familiar with the concept of the game!</p>
`
    }
];
