export interface RulesPost {
    date: number
    author: string
    title: string
    content: string
    longContent?: string
}

export const rules: RulesPost[] = [
    {
        date: 1731370468000,
        author: "hasanger",
        title: "Rules",
        content: "By playing Suroi, you agree to follow these rules. Failure to do so will result in a ban, as outlined below.",
        longContent: `
        <br>
        <h2>No hacking!</h2>
        Hacking refers to the use of any game modifications or external software that might provide a competitive advantage, including but not limited to: aimbot, melee lock, visual assists, ESP, and exploiting glitches.
        <ul>
          <li>1st offense: 30 day ban</li>
          <li>2nd offense: Permanent ban</li>
        </ul>
        If you discover an exploit or vulnerability, please report it to the admins on the Discord server, or email support@suroi.io. You will not be banned unless you abuse it or tell others about it.

        <br><br>

        <h2>No teaming!</h2>
        Teaming is defined as helping another player who is not on your team.<br>
        This can include not attacking them, giving them items, helping them kill other players, and spamming positive emotes.
        <ul>
          <li>1st offense: Warning</li>
          <li>2nd offense: 24 hour ban</li>
          <li>3rd offense: 7 day ban</li>
          <li>4th offense: Permanent ban</li>
        </ul>
        Teaming as a hacker will result in a permanent ban.

        <br><br>

        <h2>No inappropriate usernames!</h2>
        Usernames containing slurs and other hateful language are prohibited.
        <ul>
          <li>1st offense: Warning</li>
          <li>2nd offense: 7 day ban</li>
          <li>3rd offense: Permanent ban</li>
          <ul>
            <li>We have filters in place to block certain words. Attempting to bypass these filters by using special characters will result in an immediate ban.</li>
            <li>If you use a name that advertises hacks, you will be permanently banned.</li>
          </ul>
        </ul>

        <br>

        <h2>VPN/proxy policy</h2>
        To make ban evasion more difficult, VPNs and proxies are blocked. If you need one to play the game, you can request an exemption by contacting the admins on the Discord server, or emailing support@suroi.io.
        `
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
<p>Change Weapons - 1 through 4 or Scroll Wheel</p>
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
