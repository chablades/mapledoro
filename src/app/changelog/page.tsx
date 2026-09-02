"use client";

import { useState } from "react";
import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";
import { STATUS, type StatusKind } from "../../components/statusColors";

interface ChangelogEntry {
  date: string;
  changes: { type: "added" | "changed" | "fixed"; text: string }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-08-31",
    changes: [
      { type: "added", text: "Erel Light characters now get a Scouter figure, Stat Efficiency and Stat Optimizer results, now that MapleScouter supports the class." },
      { type: "added", text: "Sia Astelle and Erel Light now get the HEXA Skill Tracker's final damage breakdown and leveling guide. Their fragment costs are still placeholder values until Erda Link is supported properly." },
      { type: "added", text: "Add Sol Hecate to the leveling guide for Hayato, Kanna, Lynn and Mo Xuan." },
    ],
  },
  {
    date: "2026-08-25",
    changes: [
      { type: "added", text: "Buff Setup step now has a toggle for Power of the Rival." },
      { type: "added", text: "Mapledle and BGM Guesser now have a link for every past day, like mapledoro.com/games/bgm-guesser/11. The arrows update the address bar as you move between days, so you can bookmark or share any puzzle." },
      { type: "changed", text: "Copying your Mapledle or BGM Guesser result now shares a link to the exact day you played instead of the game's front page." },
      { type: "fixed", text: "Fixed the Scouter figure returning a failed result by matching MapleDoro's request to MapleScouter's current API." },
      { type: "fixed", text: "Fixed the Scouter figure and Scouter bookmark dropping back to a blank dash after you edited your stats and left the page, instead of continuing to show your last known value until you refresh." },
    ],
  },
  {
    date: "2026-08-20",
    changes: [
      { type: "added", text: "Settings can now back up your data to Google Drive and restore it on another device. It is optional and off until you connect, and it only saves your MapleDoro data to a private, hidden app folder that cannot see anything else in your Drive." },
      { type: "added", text: "Backing up and restoring both show you what will change first, including any characters that would be added or lost, so a backup cannot quietly wipe a character that is only saved in your Drive." },
    ],
  },
  {
    date: "2026-08-18",
    changes: [
      { type: "added", text: "The Stat Optimizer can now apply a recommendation to your character. It saves the Hyper Stat or HEXA Stat allocation and updates your saved stat window to match, then shows what your Boss 380 HEXA changed to. It asks you to confirm you have already made the change in-game first, since your saved stats would otherwise be wrong." },
      { type: "fixed", text: "Fixed the Daily Tracker and Boss Crystal Tracker letting you add the same character twice by typing a name already in the list, which left two cards the tracker could not tell apart. The Add Character dialog now says the name is already there." },
      { type: "fixed", text: "Fixed the Mystic Frontier Calculator's PASS and FAIL result being hard to read against its background, in both light and dark mode." },
      { type: "fixed", text: "Fixed the EXP Calculator's Resources tab switching to a different resource while you typed a level. Every resource now stays in the list, and one your level cannot reach yet says so instead of disappearing." },
      { type: "fixed", text: "Fixed the EXP Calculator's Daily / Weekly tab dropping your chosen Monster Park dungeon out of its list while you typed a level." },
      { type: "fixed", text: "Fixed the Cubing Calculator clearing your desired stat when you retyped the item level, even when the new level still offered that stat." },
      { type: "fixed", text: "Fixed a stray line of text appearing down the left edge of the page beside the Star Force Calculator's distribution chart in Firefox." },
    ],
  },
  {
    date: "2026-08-11",
    changes: [
      { type: "changed", text: "The home page's Reset Timers and Ursus 2x Meso panels are now one panel, with the daily reset, the weekly reset, the Wednesday event reset, and Ursus side by side. Each row shows the reset in your own time zone, and hovering one lists what it resets." },
      { type: "added", text: "The home page now counts down the v270 event resets: Ride or Die, Operation: Dive, Tallahart Fantasia, Momentum Pass, Frontier Pass, and Phantasmal Echoes on Wednesday, and Challenger Pass and Item Burning Plus with the Thursday weekly reset. Each event drops off the panel when it ends." },
    ],
  },
  {
    date: "2026-08-10",
    changes: [
      { type: "fixed", text: "Fixed Mapledle and BGM Guesser erasing each other's saved results and stats when you played both." },
    ],
  },
  {
    date: "2026-08-09",
    changes: [
      { type: "fixed", text: "MapleDoro now warns you when your browser will not save a change, instead of losing it silently, so a full or blocked browser storage no longer costs you edits without warning." },
    ],
  },
  {
    date: "2026-08-06",
    changes: [
      { type: "changed", text: "Rebuilt the EXP Calculator's Resources tab: pick a resource from the dropdown and see what every source in it pays at your level, in EXP and as a share of the level, instead of reading a raw table." },
    ],
  },
  {
    date: "2026-08-05",
    changes: [
      { type: "added", text: "The Stat Optimizer can now optimize your Hyper Stats for mobbing, with its own Normal Damage line, and keeps your bossing and mobbing values separate." },
      { type: "added", text: "Added a Hyper Preset picker to the Stat Optimizer, so you can optimize against any of your three in-game Hyper Stat presets." },
      { type: "changed", text: "The Stat Optimizer now knows that archers turn Critical Rate above 100% into Critical Damage, so it keeps recommending Critical Rate for them past the cap instead of treating it as wasted." },
      { type: "added", text: "Added a Critical Rate row to the Stat Efficiency panel for archers, showing what a Critical Rate line past 100% is worth to them." },
      { type: "changed", text: "The EXP Calculator now lets you edit your level and EXP percent with a character selected, and the Stat Optimizer your level, so you can keep using them after levelling up without waiting for the next character refresh. Each tool remembers what you type until your character catches up to it." },
      { type: "fixed", text: "Fixed the World and Sort dropdowns in Characters being unreadable when opened in dark mode." },
    ],
  },
  {
    date: "2026-08-04",
    changes: [
      { type: "added", text: "Added Characters, a full character tracker: guided setup for Stats, Equipment, Link Skills, Familiars, V Matrix, HEXA Matrix, Hyper Stats, and Legion Artifact, a profile bringing all of it together alongside MapleScouter, and JSON import/export for a single character or a whole world." },
      { type: "added", text: "Added BGM Guesser, a daily game where you name the area or boss a MapleStory track plays for in 3 tries." },
    ],
  },
  {
    date: "2026-08-03",
    changes: [
      { type: "fixed", text: "The Stat Optimizer now values your Hyper Stats and HEXA Stats against your buffed bossing stats, using your character's Scouter data, so its recommendation matches MapleScouter." },
      { type: "fixed", text: "The Stat Optimizer no longer says your stats are already optimized before you have entered anything." },
      { type: "fixed", text: "The Stat Optimizer no longer lets you enter Hyper Stat or HEXA Stat levels your character could not actually have." },
      { type: "fixed", text: "The Stat Optimizer no longer resets the Hyper Stat levels you type when no character is selected." },
      { type: "changed", text: "The Stat Optimizer now points you to Scouter setup when a character is missing the data it needs for the most accurate recommendation." },
      { type: "fixed", text: "Fixed tool inputs zooming the page in on iPhone when you tapped them." },
    ],
  },
  {
    date: "2026-08-02",
    changes: [
      { type: "added", text: "Character profiles now have a Stat Efficiency bookmark showing what a point of each stat is actually worth for that character, and how stats like Boss Damage, ATT and Ignore DEF trade off against each other." },
    ],
  },
  {
    date: "2026-07-31",
    changes: [
      { type: "fixed", text: "Fixed the HEXA Skill Tracker refusing to take levels like 10 and 11 in the Origin skill boxes." },
      { type: "changed", text: "The HEXA Skill Tracker no longer lets a skill's goal level sit below its current level." },
    ],
  },
  {
    date: "2026-07-27",
    changes: [
      { type: "fixed", text: "Fixed the Daily Tracker cutting off longer task names like Normal Crimson Queen on some browsers." },
      { type: "fixed", text: "The Mystic Frontier Solver now lets you equip more than one bonus dice of the same type, like a White and a Blue Swift-Rolling Dice." },
      { type: "fixed", text: "The Mystic Frontier Solver now offers Epic potential lines on Unique and Legendary familiars, which familiars obtained before the Mystic Frontier patch can have." },
    ],
  },
  {
    date: "2026-07-25",
    changes: [
      { type: "added", text: "The Drop Tracker can now track Original Sin of Pride, Blissful Nightmare, Total Control, Eternal Twisted Armor Box, Eternal Armor of Radiance Box, Arcane Umbra Armor Box, and AbsoLab Armor Box." },
      { type: "added", text: "The Event Planner now has Original Sin of Pride and Blissful Nightmare as items to tap." },
      { type: "added", text: "The Drop Tracker now opens with a summary of your total drops, drops this month, days since your last one, and your most dropped item." },
      { type: "changed", text: "Deleting a drop in the Drop Tracker now asks for confirmation first." },
      { type: "changed", text: "Removing an item from the Event Planner now asks for confirmation first." },
      { type: "changed", text: "The Drop Tracker item search now takes arrow keys to move through results, Enter to pick one, and Escape to close." },
      { type: "fixed", text: "Fixed the Event Planner emptying the star dropdowns and disabling Add when you picked a lower level item like Wings of Fate." },
      { type: "changed", text: "The Event Planner item search now takes arrow keys to move through results, Enter to pick one, and Escape to close." },
      { type: "fixed", text: "Fixed the EXP Calculator Daily / Weekly Calculator losing a day of EXP from plans that span a daylight saving time change." },
      { type: "fixed", text: "The EXP Calculator Daily / Weekly Calculator now credits weekly content on the game's Thursday reset instead of your local Thursday." },
      { type: "fixed", text: "Fixed the Trace Restoration Tracker projecting completion dates a day off for players outside UTC." },
      { type: "fixed", text: "Fixed the Flaming calculator wiping the decimal point as you typed values like 0.5." },
      { type: "fixed", text: "Trace Restoration now shows dates in your own region's format instead of always using the US one." },
      { type: "fixed", text: "The home page no longer falls back to months-old patch notes when the news feed is slow or unavailable." },
    ],
  },
  {
    date: "2026-07-23",
    changes: [
      { type: "added", text: "The EXP Calculator Daily / Weekly Calculator now takes Express Boosters." },
      { type: "added", text: "The EXP Calculator Resources tab now has EXP tables for Express Booster and Haste Fever Time." },
      { type: "fixed", text: "The EXP Calculator Import Into Daily/Weekly Calculator link now imports to the character selected in the Farming tab instead of your main, and the imported rate is saved to that character." },
    ],
  },
  {
    date: "2026-07-19",
    changes: [
      { type: "added", text: "Added a back to top button that appears in the corner once you scroll down a page." },
    ],
  },
  {
    date: "2026-07-17",
    changes: [
      { type: "changed", text: "The HEXA Skill Tracker Guide tab now combines back to back levels of the same skill into one step, so leveling a skill from 8 to 10 shows as a single 8 to 10 step." },
      { type: "changed", text: "The HEXA Skill Tracker FD Breakdown tab no longer lists Sol Janus." },
    ],
  },
  {
    date: "2026-07-16",
    changes: [
      { type: "fixed", text: "The EXP Calculator Farming tab now scales EXP down for monsters far above or below your level, instead of only applying the bonus for monsters within 10 levels." },
    ],
  },
  {
    date: "2026-07-14",
    changes: [
      { type: "added", text: "The HEXA Skill Tracker now has a Guide tab that lists which skills to level next, ordered by final damage gained per Sol Erda Fragment." },
      { type: "added", text: "The HEXA Skill Tracker now has an FD Breakdown tab showing how much final damage each HEXA skill gives you at its current level." },
    ],
  },
  {
    date: "2026-07-13",
    changes: [
      { type: "added", text: "Added the Stat Optimizer, a bossing-focused tool that recommends your optimal Hyper Stat allocation and HEXA Stat core line setup based on your tracked character's stats." },
      { type: "added", text: "The EXP Calculator Daily / Weekly Calculator now takes Luxe Sauna / MVP Resort hours, with the sauna's EXP table in the Resources tab." },
    ],
  },
  {
    date: "2026-07-12",
    changes: [
      { type: "added", text: "The EXP Calculator Farming tab now has an Import Into Daily/Weekly Calculator link that carries your hourly EXP over to your plan." },
      { type: "added", text: "The EXP Calculator now remembers the monster you picked in the Farming tab for each character." },
      { type: "added", text: "The EXP Calculator now lets you pick which Monster Park dungeon you run, defaulting to the best one your level can enter." },
      { type: "changed", text: "The EXP Calculator Epic Dungeon panel now takes a Bonus Multiplier, so you can enter event rates like 1.5x, 2.5x, or 4x directly." },
      { type: "changed", text: "The EXP Calculator now hides the Epic Dungeon reward multiplier for characters in Heroic worlds, which cannot buy one." },
      { type: "changed", text: "The EXP Calculator now disables the Burning dropdown at level 270 and up, where no Burning type grants extra levels." },
      { type: "fixed", text: "Fixed Mechaberry Farm Tickets in the EXP Calculator granting thousands of times too much EXP." },
      { type: "fixed", text: "Fixed the EXP Calculator not letting you type a Current EXP % below 1, like 0.5." },
      { type: "fixed", text: "Fixed text boxes, dropdowns, and date pickers sitting in the same row being slightly different heights in the Liberation Tracker, the Trace Restoration Tracker, and the Flame Calculator." },
      { type: "fixed", text: "Fixed Daily Tracker characters added by typing a name showing a default avatar instead of their first letter like the Boss Crystal Tracker." },
      { type: "fixed", text: "Fixed number boxes in the EXP Calculator, Star Force Calculator, Symbol Calculator, Liberation Tracker, Trace Restoration Tracker, and HEXA Skills tool fighting your typing when a value hit its cap, so they now let you finish typing and settle when you click away." },
    ],
  },
  {
    date: "2026-07-10",
    changes: [
      { type: "added", text: "Added a compact strip with the daily, weekly, and Ursus timers to the home screen on phones and small windows." },
      { type: "changed", text: "The Miracle Time panel now appears right below the timers on the phone home screen instead of near the bottom." },
      { type: "changed", text: "The home screen banner is now smaller on phones so tools and timers show up sooner." },
      { type: "changed", text: "The Daily Tracker now works like the Boss Crystal Tracker: add characters yourself with the Add character card, pick each one from your imports or type a name, and drag the cards to reorder them." },
      { type: "added", text: "Added the Geardock Sacred Symbol daily to the Daily Tracker." },
      { type: "changed", text: "The Daily Tracker now allows up to 14 Monster Park runs per world, so two characters can each do their 7." },
      { type: "added", text: "Added Hard and Extreme Black Mage to the Boss Crystal Tracker as a monthly boss that resets on the first of each month and does not count against a character's 14 crystal limit." },
      { type: "changed", text: "The Boss Crystal Tracker Heroic and Interactive toggle now filters your characters by world instead of just changing crystal prices." },
      { type: "changed", text: "The Boss Crystal Tracker now opens on Interactive when all your characters are in Interactive worlds." },
      { type: "changed", text: "Adjusted every color theme so text meets accessible contrast in both light and dark mode." },
      { type: "fixed", text: "Fixed accent colored text being hard to read in dark mode across the site." },
      { type: "fixed", text: "Fixed the Active badges, changelog tags, and Reset buttons having text that was too faint to read." },
      { type: "fixed", text: "Fixed the completed count in the Daily Tracker and the correct and incorrect marks in Mapledle being hard to read." },
      { type: "fixed", text: "Fixed the Star Force Calculator freezing the page when the target star was set to 29 or 30." },
      { type: "fixed", text: "Fixed the Star Force Calculator Trials field snapping back to 1000 when you tried to clear it." },
      { type: "fixed", text: "Fixed the Cubing Calculator clearing your Desired Stat when you edited the Item Level." },
      { type: "fixed", text: "The Cubing Calculator Double Miracle Time toggle is now off for Occult, Master, and Meister cubes, which the event does not affect." },
      { type: "changed", text: "The Star Force Calculator now warns you before an expensive run, shows progress while it works, and lets you stop it." },
      { type: "changed", text: "The Cubing Calculator now updates as you change the form, so there is no Calculate button and results are never out of date." },
      { type: "changed", text: "The Cubing Calculator now shows average and percentile costs in one table, with cube counts and meso costs side by side." },
      { type: "fixed", text: "The level 296 Geardock monster in the EXP Calculator is now Strike Securitron instead of Surveillance Robot." },
    ],
  },
  {
    date: "2026-07-09",
    changes: [
      { type: "added", text: "Added Normal and Hard Malefic Star and Jupiter to the Boss Crystal Tracker." },
      { type: "added", text: "The EXP Calculator Farming Calculator now saves your buffs, target level, and hourly kill count per character, so switching back to a character restores what you set for them." },
      { type: "added", text: "The EXP Calculator Daily / Weekly Calculator now saves your target level, burning, date range, daily and weekly content, Monster Park, and Epic Dungeon settings per character." },
      { type: "changed", text: "The EXP Calculator now opens on your main character instead of Manual Level." },
      { type: "changed", text: "The EXP Calculator monster dropdown now lists monsters closest to your character's level first." },
    ],
  },
  {
    date: "2026-07-08",
    changes: [
      { type: "changed", text: "The EXP Calculator now uses a wider layout with paired panels and compact icon tiles for additive buffs to reduce scrolling." },
      { type: "changed", text: "Link skills, Roro's Experience Ring, Grand Sacred Symbols, Legion Artifact, Champion's Renown, and EXP nodestones in the EXP Calculator are now compact level tiles with hover tooltips instead of dropdowns." },
      { type: "changed", text: "Pendant of the Spirit is now a toggle under Additive Buffs in the EXP Calculator." },
      { type: "changed", text: "The EXP Calculator now shows Roll of the Dice only when the selected character is a Pirate class." },
      { type: "changed", text: "The EXP Calculator Daily / Weekly tab now pairs panels side by side and uses compact run-count tiles for weekly content to reduce scrolling." },
      { type: "added", text: "The EXP Calculator Farming Calculator now has a Target Level input, and the overview shows hours to reach that target level instead of just the next level." },
      { type: "changed", text: "Redesigned the Tools page into compact category panels so the full list of tools is easier to scan." },
      { type: "added", text: "Added an Endgame Preset and a Reset button to the Trace Restoration Calculator for quickly selecting or clearing missions." },
      { type: "fixed", text: "Fixed not being able to select Extreme Seren in the Trace Restoration Calculator." },
    ],
  },
  {
    date: "2026-07-07",
    changes: [
      { type: "added", text: "Added the EXP Calculator with GMS EXP Buffs + Monster EXP, All-in-One, and resource table tabs." },
      { type: "changed", text: "Rebuilt the EXP Calculator Daily / Weekly tab as a GMS content planner with dailies, weeklies, events, tickets, and growth potions." },
    ],
  },
  {
    date: "2026-07-06",
    changes: [
      { type: "changed", text: "The Miracle Time panel on the homepage now hides itself when there is no upcoming schedule instead of showing an empty box." },
    ],
  },
  {
    date: "2026-07-03",
    changes: [
      { type: "fixed", text: "Fixed the Liberation Tracker sharing one current quest and trace count across the Genesis, Destiny Part 1, and Destiny Part 2 tabs, so each tab now keeps its own progress." },
    ],
  },
  {
    date: "2026-06-28",
    changes: [
      { type: "added", text: "The HEXA Skill Tracker summary now shows Sol Erda and Sol Erda Fragment icons alongside how much you have accumulated toward the total." },
      { type: "fixed", text: "Fixed the Liberation Tracker adding an extra week to the completion estimate in some scenarios." },
    ],
  },
  {
    date: "2026-06-27",
    changes: [
      { type: "added", text: "Added a Hard mode to Mapledle where you guess the exact skill instead of just the class, matching the Discord version." },
      { type: "added", text: "You can now replay previous days in Mapledle using the arrows next to the puzzle." },
    ],
  },
  {
    date: "2026-06-25",
    changes: [
      { type: "added", text: "Added a Miracle Time panel to the homepage showing which equipment categories are featured each day." },
    ],
  },
  {
    date: "2026-06-17",
    changes: [
      { type: "changed", text: "Renamed Boom Reduction to Enhancement Mode in the Star Force Calculator, and the 30% events now stack with it." },
    ],
  },
  {
    date: "2026-06-16",
    changes: [
      { type: "fixed", text: "Fixed Sunny Sunday events not showing when they were split across multiple Discord posts." },
      { type: "fixed", text: "Fixed the light/dark mode toggle knob not sitting centered." },
    ],
  },
  {
    date: "2026-06-12",
    changes: [
      { type: "added", text: "Added Mapledle, a daily skill guessing game, under the new Games section." },
      { type: "added", text: "Added a check all button to the Boss Crystal Calculator to check or uncheck every boss at once." },
      { type: "changed", text: "Tools with a character selector now default to your Main character." },
      { type: "changed", text: "The weekly reset countdown now shows days, hours, and minutes." },
      { type: "changed", text: "The Flame Calculator now starts with the guild discount enabled." },
      { type: "changed", text: "The Cubing Calculator now keeps your desired stat selection unless the item type requires a different set of stats (such as WSE)." },
    ],
  },
  {
    date: "2026-06-10",
    changes: [
      { type: "changed", text: "Revamped the Event Planner with a cleaner layout and improved character syncing." },
      { type: "changed", text: "Improved use of vertical space in the HEXA Skill, Liberation, and Symbol trackers." },
      { type: "fixed", text: "Fixed several behavior issues on iOS." },
    ],
  },
  {
    date: "2026-06-09",
    changes: [
      { type: "changed", text: "Unified button styling across tools for a more consistent look." },
      { type: "fixed", text: "Fixed the current points input losing its styling in the Trace Restoration Calculator." },
      { type: "fixed", text: "Fixed uneven panel heights in the Liberation Tracker." },
    ],
  },
  {
    date: "2026-06-08",
    changes: [
      { type: "added", text: "The Boss Crystal Tracker now also tracks weekly clear status." },
    ],
  },
  {
    date: "2026-06-07",
    changes: [
      { type: "added", text: "Added the Geardock symbol to the Symbol Tracker." },
      { type: "added", text: "Added the ability to customize which tools appear on the homepage." },
      { type: "changed", text: "Tool pages now show your character's image in the character selector." },
    ],
  },
  {
    date: "2026-06-06",
    changes: [
      { type: "added", text: "Added Erel Light to the HEXA Skill Tracker." },
      { type: "added", text: "Added an outcome histogram to the Star Force Calculator." },
      { type: "changed", text: "Revamped the Pitched Boss Drop Tracker with a new drop logging dialog and improved charts." },
      { type: "changed", text: "Improved controls and feedback in the Star Force Calculator." },
      { type: "fixed", text: "Fixed newly added Sia Astelle characters not being identified correctly in the HEXA Skill Tracker." },
    ],
  },
  {
    date: "2026-06-05",
    changes: [
      { type: "added", text: "Added experimental boom reduction tiers to the Star Force Calculator." },
    ],
  },
  {
    date: "2026-06-03",
    changes: [
      { type: "changed", text: "Improved number input controls across trackers." },
      { type: "fixed", text: "Fixed the Liberation Tracker wiping saved progress in some cases." },
    ],
  },
  {
    date: "2026-05-28",
    changes: [
      { type: "fixed", text: "Fixed the Cubing and Flame calculators truncating entered values." },
    ],
  },
  {
    date: "2026-05-20",
    changes: [
      { type: "fixed", text: "Fixed the font not rendering correctly on the Guides page." },
    ],
  },
  {
    date: "2026-05-19",
    changes: [
      { type: "fixed", text: "Fixed various mobile layout issues across the site." },
    ],
  },
  {
    date: "2026-05-17",
    changes: [
      { type: "added", text: "Added the Trace Restoration Calculator for estimating trace costs across different success rates." },
      { type: "added", text: "Added the Flame Calculator for estimating expected flame score outcomes." },
      { type: "changed", text: "Revamped the homepage layout with a cleaner design." },
      { type: "changed", text: "Moved account-wide reminders from the homepage into the Daily Tracker." },
      { type: "changed", text: "Tweaked several themes for better contrast." },
    ],
  },
  {
    date: "2026-05-14",
    changes: [
      { type: "added", text: "Added Sol Hecate, Astra Secondary, and Destiny Liberation 2 to the Liberation Tracker." },
      { type: "changed", text: "Analytics now requires explicit user consent before activating." },
    ],
  },
  {
    date: "2026-05-13",
    changes: [
      { type: "fixed", text: "Fixed Daily Tracker layout on small screens, which now displays a single column on mobile." },
      { type: "fixed", text: "Fixed the light/dark mode toggle overflowing on small screen sizes." },
      { type: "fixed", text: "Fixed completion timeline collapsing on mobile views." },
      { type: "fixed", text: "Fixed mobile padding not applying correctly to some tool pages." },
    ],
  },
  {
    date: "2026-05-10",
    changes: [
      { type: "added", text: "Expanded character guide pages with community resources, skill icons, class infographics, and HEXA guide images where available." },
      { type: "changed", text: "Replaced placeholder quick-nav icons on homepage with intended icons." },
      { type: "fixed", text: "Fixed the Liberation Tracker bottom panel losing its styling in some layouts." },
      { type: "fixed", text: "Fixed Liberation Tracker completion dates being off by one day from weekly boss reset." },
    ],
  },
  {
    date: "2026-05-08",
    changes: [
      { type: "added", text: "Added a global light/dark mode selector and added theme selector under Settings." },
      { type: "added", text: "Added import and export data under Settings for backing up site data." },
    ],
  },
  {
    date: "2026-05-05",
    changes: [
      { type: "added", text: "Added a character profile overview with stat tabs, WSE equipment slots, and HEXA skill previews." },
      { type: "added", text: "Added automatic character refresh and stale-data indicators for saved character profiles." },
      { type: "added", text: "Added Sia Astelle to the HEXA Skill Tracker." },
      { type: "fixed", text: "Fixed Liberation, Symbol, and HEXA trackers loading wrong job by default." },
    ],
  },
  {
    date: "2026-05-01",
    changes: [
      { type: "added", text: "Added brief instructions to tool pages to make each calculator and tracker easier to start using." },
    ],
  },
  {
    date: "2026-04-27",
    changes: [
      { type: "changed", text: "Improved the Cubing Calculator experience with clearer controls and feedback." },
      { type: "changed", text: "Refined the Daily Tracker visuals." },
      { type: "fixed", text: "Fixed Liberation Tracker date calculations." },
    ],
  },
  {
    date: "2026-04-21",
    changes: [
      { type: "added", text: "Added the Daily Tracker for symbol dailies, daily bosses, and daily content across characters." },
      { type: "added", text: "Added the Cubing Calculator for estimating expected cube cost and cube counts." },
      { type: "changed", text: "Reorganized the Tools page into calculators, trackers, and planners." },
      { type: "changed", text: "Moved the Boss Crystal Tracker into the tracker section." },
    ],
  },
  {
    date: "2026-04-20",
    changes: [
      { type: "added", text: "Added milestone tracking to the Liberation calculators." },
    ],
  },
  {
    date: "2026-04-18",
    changes: [
      { type: "fixed", text: "Fixed Liberation Tracker end dates so they line up with MapleStory reset timing." },
    ],
  },
  {
    date: "2026-04-13",
    changes: [
      { type: "added", text: "Added the Character Guides page with searchable MapleStory class cards." },
    ],
  },
  {
    date: "2026-04-11",
    changes: [
      { type: "added", text: "Made character panels draggable in the Boss Crystal Calculator." },
    ],
  },
  {
    date: "2026-04-10",
    changes: [
      { type: "added", text: "About, Terms of Service, Privacy Policy, and Changelog pages linked from the footer." },
      { type: "fixed", text: "Sunny Sunday events now expire client-side so stale cached responses don't show past weeks." },
      { type: "changed", text: "Sunny Sunday dates now display in the user's local timezone with timezone abbreviation." },
      { type: "added", text: "ACTIVE badge on the Sunny Sunday panel when the event is currently happening." },
    ],
  },
];

const TYPE_LABEL: Record<ChangelogEntry["changes"][number]["type"], string> = {
  added: "Added",
  changed: "Changed",
  fixed: "Fixed",
};

const TYPE_STATUS: Record<ChangelogEntry["changes"][number]["type"], StatusKind> = {
  added: "success",
  changed: "info",
  fixed: "warning",
};

const ENTRIES_PER_PAGE = 7;

function ChangelogContent({ theme }: { theme: AppTheme }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(CHANGELOG.length / ENTRIES_PER_PAGE);
  const firstEntry = (page - 1) * ENTRIES_PER_PAGE;
  const visibleEntries = CHANGELOG.slice(firstEntry, firstEntry + ENTRIES_PER_PAGE);

  const paginationButtonStyle = {
    border: `1px solid ${theme.border}`,
    borderRadius: "999px",
    background: theme.panel,
    color: theme.text,
    padding: "0.45rem 0.8rem",
    fontSize: "0.8rem",
    fontWeight: 800,
    fontFamily: "inherit",
    cursor: "pointer",
  } as const;

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-title" style={{ color: theme.text }}>
          Changelog
        </div>
        <div className="page-subtitle" style={{ color: theme.muted }}>
          Notable updates to MapleDoro, newest first.
        </div>

        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {visibleEntries.map((entry) => (
            <div
              key={entry.date}
              className="fade-in panel-card"
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: theme.text }}>
                  {entry.date}
                </div>
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {entry.changes.map((change) => (
                  <li
                    key={change.text}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      fontSize: "0.88rem",
                      color: theme.text,
                      fontWeight: 400,
                      lineHeight: 1.6,
                    }}
                  >
                    <span
                      className="changelog-type-pill"
                      style={{
                        background: STATUS[TYPE_STATUS[change.type]].fill,
                        color: STATUS[TYPE_STATUS[change.type]].on,
                      }}
                    >
                      {TYPE_LABEL[change.type]}
                    </span>
                    <span>{change.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginTop: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: theme.muted, fontSize: "0.82rem", fontWeight: 700 }}>
              Showing {firstEntry + 1}-{Math.min(firstEntry + ENTRIES_PER_PAGE, CHANGELOG.length)} of {CHANGELOG.length}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                style={{
                  ...paginationButtonStyle,
                  opacity: page === 1 ? 0.45 : 1,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ color: theme.muted, fontSize: "0.82rem", fontWeight: 800 }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                style={{
                  ...paginationButtonStyle,
                  opacity: page === totalPages ? 0.45 : 1,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <AppShell currentPath="/changelog">
      {({ theme }) => <ChangelogContent theme={theme} />}
    </AppShell>
  );
}
