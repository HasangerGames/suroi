export interface RulesPost {
    date: number
    author: string
    title: string
    content: string
    longContent?: string
}

export const rules: RulesPost[] = [
    {
        date: 1718044800000,
        author: "Error",
        title: "Rules",
        content: "By playing Suroi, you agree to abide by the following rules. Breaking the rules may result in a ban.",
        longContent: `<ul>
  <li><strong>No teaming in solo.</strong> Allying with other solo players for extended periods of time is not allowed.</li>
  <li><strong>No hacking.</strong> The use of scripts, plugins, extensions, etc. to modify the game in order to gain an advantage over opponents is strictly forbidden.</li>
  <li><strong>No inappropriate usernames.</strong> Our blocklists are very lenient, but some things are still blocked. Trying to evade filters for these specific words may incur consequences.</li>
  <li><strong>No presence in cheat related servers.</strong> Attempting to "minimod" or "go undercover" in any cheat related servers is strictly prohibited and can get your discord, as well as your connection <strong>banned.</strong></li>
</ul>`
    },
    {
        date: 1690908230000,
        author: "Katloo",
        title: "Tutorial",
        content: "If you're a new player, check out this tutorial to learn how to play!",
        longContent: `<h2>Controls</h2>
<p>Movement - WASD or Arrow Keys</p>
<p>Aim - Mouse</p>
<p>Attack - Left-Click</p>
<p>Change Weapons - 1 through 3 or Scroll Wheel</p>
<p>Pickup/Loot/Interact/Revive - F</p>
<p>Reload - R</p>
<p>Use Healing Item - Left-Click on item or 7 through 0</p>
<p>Cancel Action - X</p>
<p>Toggle Fullscreen Map - G or M</p>
<p>Toggle Minimap - N</p>
<p>Use Emote Wheel - Hold Right-Click, drag, and release</p>
<p>Team Ping - Hold Right-Click and C, drag, and release</p>
<p>Request Item - Hold C and click on item</p>
<p>Drop Item - Right-Click on item</p>
<p>Equip Last Item - Q</p>
<p>Swap Gun Slots - T</p>
<p>Equip Other Gun - Space</p>
<p>Change Scope Zoom - Left-Click on Scope</p>

<h3>Keybinds can be changed in settings!</h3>

<h2>How to Play</h2>
<p>The goal of Suroi is to be the last player standing. You'll start with nothing, so move around the map to get weapons, scopes, armor, healing items, and ammo. If you see another player, eliminate them for their loot!</p>

<h2>Orange = Bad</h2>
<p>You have another enemy to watch out for: a deadly orange gas. The gas slowly fills the map as the game progresses, making the safe zone smaller and smaller. The damage increases each time it shrinks.</p>

<h2>Similar Games</h2>
<p>If you've played games like PUBG, Fortnite, and Apex Legends, or other browser battle royales like surviv.io and zombsroyale.io, you might be familiar with the concept of the game!</p>
`
    }
];
