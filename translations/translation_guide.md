# Suroi Translation Guide
This document was created to make translating Suroi easier for
everyone. It contains useful information for both new
translators and more experienced ones. This document is quite
long though, and no one expects You to read it entirely, however
it is highly recommended when translating Suroi.

# Translating From Scratch
**You will be given a file titled `en.hjson` (*may vary*). That
file contains the string keys and their values in English. As a
translator, Your job is to translate all of the strings into
Your language.** In case You want to download the file Yourself,
it is available
[here](https://github.com/HasangerGames/suroi/blob/master/translations/languages/en.hjson).

# Translating New Content
When new content is added to the game, it should be translated.  
Here are a few key points to keep in mind while translating new
content:
- Translation managers, developers or others may announce new
keys to the translators in the translation channel of the
Discord server.
- When there are a lot of strings to translate, You should add
them to Your file at a desired place and translate them, then
submit Your translations (see section Submitting Your
Translations).
- When there are only a few untranslated strings and You have
not been instructed to add them to the language file, You may
simply translate them, and send the translated strings back, not
the whole file.
- Do not share details about translations, that are not yet
included in game or that may reveal information about upcoming
features.
- When You are unsure, what strings Your language is missing,
or if any, either
	- read [the translation README.md](https://github.com/HasangerGames/suroi/blob/master/translations/README.md) or
	- in case the previous method has out-of-date information or
	You cannot access it, ask a responsible translator,
	developer or other person in the Discord server and
	preferrably in the translation channel.

# Grammatical Errors & Spelling Mistakes
We all make mistakes. In case You spot a grammatical error or
spelling mistake, it is recommended to either
- fix it Yourself, if You are a translator of that language,
- notify the translator of that language about it or
- in case You are not familiar with the translation system,
notify any developer or manager about it, as they may be able to
help or fix it.

# More Information About Translations
Here You will find some additional information regarding
translations.

## Correctness of Translations
Translations do not have to be perfect or ideal, however, as a
translator, You should attempt to make them as good as possible.

## Translatable Languages
You can translate Suroi into any language You wish. However,
some languages may not be accepted to be included in Suroi for a
few reasons, including:
- the language has few or no speakers
- the language is very similar to another (for example, British
and American English)
- the language may be offensive
- it is a joke language (there are at least two already)

If Your language is not eligible to be included in Suroi, You
may still host it locally Yourself.

## Grammar
**Exceptions can be made for languages, which have unusual or
irregular grammar.** If You know that, or have noticed that
there is no way to make the translations (or a part of them)
grammatically correct or the translations will be more easily
understandable for others, only if there were altered behaviour
for some or all translations, You can ping (*at-mention*) a
translator or responsible person or developer in the Discord
server and request an exception. Don't be afraid to do that,
if there is clear reasoning behind it.  
Some already known exceptions include:
- Chinese and Japanese are more legible without whitespace (` `)
between characters, where it is usually automatically inserted.
You need to manually remove every single whitespace manually,
and add `"no_space": true` to the file
- Turkish and Estonian `"kf_message"` should only have the `'i`
after the `<victim>`, if the victim exists (this is not the case
for one party kills for example *commiting suicide*)
- Hungarian and Greek have a blank `"you"` key for the kill
modal, which requires no additional whitespace (` `) after it
- English has either `a` or `an` as the article before different
words, especially obvious in the killfeed when killing a player
with the impact of a type of grenade

# Submitting Your Translations
You can submit Your translations in any of the following ways:
- Send Your translations to the translation channel in the
Discord server and then ping (*at-mention*) a responsible
person.
- Send Your translations to a responsible person as a direct
message (DM) on Discord. (In case this fails, see previous
bullet point.)
- Make a pull request to
[the Github repository](https://github.com/HasangerGames/suroi) with
the desired language file modified or added.

The translations may be reviewed and modified by a responsible
person, in case it is necessary.

# File Format
The file itself is in the following format:
- The first line is `{`.
- Everything between are key-value pairs or comments
- The last line is `}`.

## Key-Value Pairs
Summary: **Most key-value pairs in the file are stored like
this: `"key": "value"`**  
Key-value pairs are a form of data representation used in
computing systems. As a translator, You do not need to know,
where they are used, what their pros and cons are, etc.  
However, You do need to know some basics about them.
1. The keys and values are usually enclosed with `"`. While
others are also allowed, it is recommended to not use anything
else and stick to the default formatting.
2. At the beginning of the file, You may find values, that are
not enclosed with `"`. These are usually only `true` or `false`
values.
3. Key-value pairs are seperated by a newline (specifically LF)
character. They may also be seperated by commas (`,`) but it is
highly recommended to not use commas and stick to using newlines
(as is the default).
4. For consistency, all key-value pairs should be indented by
two space characters.  
Here is an example of several correctly formatted key-value
pairs:
```
  "rules_and_tutorial": "Rules & Tutorial"
  "news": "News"
  "donate": "Donate"
  "loadout": "Loadout"
  "settings": "Settings"
  "fullscreen": "Fullscreen"
```
- Do the key-value pairs have a certain order, in which they
must appear? - No, there is no fixed order, and You should not
worry about the order. When new content is added, place it into
the file at any location of Your choice.
- Can I move key-value pairs around? - Yes, but it is strongly
advised to not do that.


## Comments
Summary: **Comments usually come after the key-value pair on a
line, are not mandatory and instead are used as notes or
acknowledgements and are usually in the following format:
`... // This is a comment`**  
Comments are parts of the file, that are ignored by the program.
They are used to convey inportant information and notices by the
developers to aid the translation process. Comments can start
with a hash (`#`) or a *double slash* (`//`).  
You should be careful with these, however. If You ever wish to
include them, be careful, as there is a possibility, that You
accidentally comment-out required key-value pairs. So it is
recommended to not add them Yourself.  
- Can I add comments myself? - Yes, You can add comments Yourself
for a variety of reasons, such as to inform other translators
about something, that You have found to be strange. Please use
*double slash* comments, as they are the standard for Suroi
translations.
- Can I remove comments? - Yes, You can, as they are not
mandatory.
- Do I have to translate the contents of comments? - No, and it
is recommended, that You do not translate the contents of
comments.
- Comments are not mandatory, so do I have to follow
instructions or acknowledge the notices in the comments? - Yes,
they are there to make the translation process easier for
everyone.

## What to Translate
Do translate:
- values of key-value pairs (i.e. the part after `:`)

Optionally translate (not required, only translate if totally
necessary):
- comments (i.e. the part after `//`)

Do **not** translate:
- keys of key-value pairs (i.e. the part before `:`)
- values that are `true` or `false` (they must remain in
English)
- text inside `<>` (for example `<br>`, `<reason>`, `<player>`,
`</li>` These can be either HTML tags or variables.)
- escape sequences a.k.a. single character after a backslash
(`\`), such as `\n`

Note: The `"report_instructions"` key has a lot of confusing
parts. See section Key Descriptions for information on that.

## Filename
The filename is usually the two-letter identifier of the
language, and its extension is `.hjson` (e.g. "ru.hjson").
A list of the language identifiers can be found
[here](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes#Table)
(look at *Set 1* of the table).
- I am unable to open/view/edit/download the file. What do I
do? - Request a text file from another translator by pinging
them in the Discord server or copy it Yourself from
[the Github repository](https://github.com/HasangerGames/suroi/blob/master/translations/languages/en.hjson).
- I cannot rename the file or include the `.hjson` file
extension. What do I do? - Do not worry, just send the file
as-is to one who is responsible for the translations and they
will do it themselves.

# Key Descriptions
Here are descriptions of some keys, notes about them, what they
mean, where they are used, etc.

## Meta Keys
These keys are only used to provide information about the
language, and other than `"name"` and `"flag"`, none of them
are actually used in translatable texts.
- `"name"` is the name of the language, in the language itself.
- `"flag"` is the emoji of the flag of the language or the
country, where the language is spoken. A list of flag emojis can
be found
[here](https://en.wikipedia.org/wiki/Regional_indicator_symbol#Emoji_flag_sequences).
- `"mandatory"` should be `false` for all languages, except
English.
- `"no_space"` - set to `true` for languages, that do not use
spaces to separate words (e.g. Japanese, Chinese, etc.), and
set to `false`, for every other languages.
- `"no_resize"` - indicates if text on the user interface should
not scaled, if it does not fit the desired space. This should be
`false` for most languages and only `true` for English or any
other language, for which all text fits elements propertly
without any scaling.

## Other Keys
These keys are used in translatable texts. Most of them are just
simple texts, but there are some, that contain words like this:
`<something>`. These "words" are called *variables*. Unless stated
otherwise (via comments), these are special pieces of the text, 
as they are replaced with corresponding items, i.e. `<player>` 
is replaced with the name of the player, `<item>` is replaced 
with the usable item, etc.
Note: You **can move** these *variables* around in the text, if
it's required by the grammar of the language, but **do not**
remove them.
### Example:
Original:
```
  "action_revive": "Revive <player>"
```
Translated example (Hungarian):
```
  "action_revive": "<player> újraélesztése"
```
Note the changed position of the `<player>` variable.  
**IMPORTANT**: You should **never** remove variables, as they
can break the translations.

### Some confusing keys:
- `"report_instructions"` has a lot of confusing parts, so here
is a translated example in comparison with the original.
Original:
```
  "report_instructions": "\n      <p><strong>Please follow the instructions below!</strong> If you don't, your report will be ignored.</p>\n      <h4>How to Submit a Report</h4>\n      <ol>\n        <li>Join the <a href=\"https://discord.suroi.io\">Discord server.</a></li>\n        <li>Go to the <a href=\"https://discord.com/channels/1077043833621184563/1135288369526607973\">#cheater-reports\n            channel.</a></li>\n        <li>Read the report guidelines in the pinned post.</li>\n        <li>Submit your report as a post.</li>\n      </ol>"
```
Translated example (Hungarian):
```
  "report_instructions": "\n    <p><strong>Kérlek kövesd az alábbi utasításokat!</strong> Ha nem teszed, a jelentésed figyelmen kívül lesz hagyva.</p>\n    <h4>Hogyan kell Beküldeni egy Jelentést</h4>\n    <ol>\n      <li>Csatlakozz a <a href=\"https://discord.suroi.io\">Discord szerverhez</a>!</li>\n      <li>Menj a <a href=\"https://discord.com/channels/1077043833621184563/1135288369526607973\">#cheater-reports\n          csatornához</a>!</li>\n      <li>Olvasd el a jelentési útmutatót a kitűzött posztban!</li>\n      <li>Küldd be a jelentésedet posztként!</li>\n    </ol>"
```
- `"keybind_clear_tooltip"` has two HTML tags: an opening and a closing tag (`<kbd>` and `</kbd>` respectively). You
should **not** change them, nor move them, just translate the rest.
- `"kf_bleed_out_down"` and `"kf_finished_off_down"` - these
should never show up in the game during normal circumstances,
but You should translate them anyways.
- `"km_message"` - This key is used in the kill modal i.e.
the display that shows up, when the player gets a kill, along
with their new kill count. This key contains 6 variables,
their meanings:
	- `<you>` - will be replaced with the key `"you"`
	- `<finally>` - will be optionally replaced with the
	key `"finally` when appropriate
	- `<event>` - will be replaced with either `"km_killed"`
	or `km_knocked`, whichever is appropriate
	- `<victim>` - will be replaced with either the name of
	the victim player, or the key `"yourself"`, whichever
	is appropriate
	- `<with>` - will be replaced with the keys `"with"`
	- `<weapon>` - will be replaced with the weapon used by
	the player
- `"kf_message"` - this key is used in the killfeed, whenever
a player gets a kill. This key contains 6 variables, their
meanings:
	- `<player>` - will be replaced with the name of the
	player, who got the kill
	- `<finally>` - will be optionally replaced with the
	key `"finally"` when appropriate
	- `<event>` - will be replaced with either
	`"kf_killed"`, `"kf_knocked"`, or `"kf_finished_off"`
	whichever is appropriate
	- `<victim>` - will be replaced with either the name of
	the victim player, or the key `"themselves"`, whichever
	is appropriate
	- `<with>` - will be replaced with the keys `"with"`
	- `<weapon>` - will be replaced with the weapon used by
	the player
- `"tt_restores"` - tooltip for the healing items. This key
contains 3 variables, their meanings:
	- `<item>` - will be replaced with either `"gauze"`,
	`"medikit"`, `"cola"` or `"tablets"`
	- `<amount>` - will be replaced with a number
	- `<type>` - will be replaced wiht either `"health"`,
	or `"adrenaline"`
- `"tt_reduces"` - tooltip for the equipment items. This key
contains 2 variables, their meanings:
	- `<item>` - will be replaced with either
	`basic_vest`, `regular_vest`, `tactical_vest`,
	`basic_helmet`, `regular_helmet` or
	`tactical_helmet`.
	- `<percent>` - will be replaced by a number (without the
	percentage sign (`%`))

### Another example with variables
Original:
```
  "km_message": "<you> <finally> <event> <victim> <with> <weapon>"
```
Translated example (German):
```
  "km_message": "<you> hast <victim> <finally> <with> <weapon> <event>"
```
Again, several *variables* have been moved, due to grammar. Text
had also been added between the *variables*. Both of these are
allowed.

# Tips for Translators
- You can usually find content within Your file by searching
using `Ctrl + F`.
- Use online translation services or artificial intelligence if
it can assist You with translating, but remember to check their
translations, as they can be faulty.
- Use a dictionary, if You are unsure about a word.

# Credits
Thank You to all translators of Suroi for making the game more
accessible for players around the globe.  
This document was written by Huba (@ersek.huba) and L420
(@_42l).  

Created:	26th Dec 2024  
Published:	---- --- ----  
Modified:	27th Dec 2024
