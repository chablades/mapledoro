"use client";

/*
  New Players Guide page.
  A long-form guide with text sections and images for MapleStory beginners.
*/
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "../../../components/AppShell";
import type { AppTheme } from "../../../components/themes";

/* ── Section data ──────────────────────────────────────────────── */

interface GuideSection {
  id: string;
  title: string;
  /* image path inside /public/guides/new-players/ */
  image?: string;
  imageAlt?: string;
  body: string;
}

const SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    title: "Welcome to MapleStory",
    image: undefined, // e.g. "/guides/new-players/welcome.png"
    imageAlt: "",
    body: `Welcome to MapleStory. MapleStory is a free-to-play 2D side-scrolling MMORPG that has been running since 2003. You play as a character in the Maple World, leveling from 1 all the way to the cap of 300 by fighting monsters, completing quests, and tackling increasingly difficult bosses.

The gameplay loop revolves around dailies, weekly bossing, farming, and gear progression. Each day you'll complete daily quests and bosses to earn resources and strengthen your character. Each week you'll take on harder bosses for mesos and rare drops. In between, you'll farm maps for EXP and mesos, and pour those gains into upgrading your equipment through systems like Star Force, cubing, and flaming.

In this guide, you'll learn how to get started, pick a class, understand the core systems, and begin progressing your character. Whether you're completely new or returning after a long break, this will walk you through the essentials.`,
  },
  {
    id: "choosing-class",
    title: "Choosing Your Class",
    image: undefined,
    imageAlt: "",
    body: `MapleStory has over 50 playable classes, and the best one to pick is whichever one you think looks cool. Seriously — every class can clear all content in the game, so there's no wrong choice. Watch some gameplay videos, try a few out to level 30 or so, and see which playstyle clicks with you.

Some classes are flashy and fast, others are tanky and methodical. Some have huge mobbing skills that wipe the map, others excel at bossing with high single-target damage. You don't need to commit right away either — making multiple characters is actually encouraged since they provide passive stat boosts to your whole account through the Legion system.

Can't decide? Hit the button below and let fate choose for you.`,
  },
  {
    id: "early-leveling",
    title: "Early Leveling",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
  {
    id: "core-mechanics",
    title: "Core Mechanics",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
  {
    id: "tips",
    title: "Useful Tips",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
];

/* ── Class data for randomizer ─────────────────────────────────── */

type Difficulty = "Easy" | "Normal" | "Hard";

interface MapleClass {
  name: string;
  region: string;
  summary: string;
  difficulty: Difficulty;
  link: string;
  legion: string;
  /** portrait path inside /public/guides/new-players/classes/ */
  portrait?: string;
}

const CLASS_REGIONS = [
  "Explorers",
  "Cygnus Knights",
  "Heroes of Maple",
  "Resistance",
  "Demons",
  "Nova",
  "Flora",
  "Anima",
  "Other",
  "Sengoku",
  "Friends of Maple",
] as const;

const CLASSES: MapleClass[] = [
  // ── Explorers ──
  { name: "Hero", region: "Explorers", summary: "Warrior who wields greatswords with powerful combo attacks.", difficulty: "Easy", link: "Combo Kill Orbs (chance to spawn orbs that grant EXP)", legion: "STR +10/20/40/80/100" },
  { name: "Paladin", region: "Explorers", summary: "Holy warrior with elemental charges and high survivability.", difficulty: "Easy", link: "Elemental Resistance (+2/4/6% elemental resistance)", legion: "STR +10/20/40/80/100" },
  { name: "Dark Knight", region: "Explorers", summary: "Spear-wielding warrior who sacrifices HP for devastating power.", difficulty: "Easy", link: "Final Pact (revive on death with invincibility)", legion: "HP +2/3/4/5/6%" },
  { name: "Arch Mage (Fire/Poison)", region: "Explorers", summary: "Mage specializing in fire and poison DoT magic.", difficulty: "Normal", link: "Elemental Decrease (-2/4/6% enemy elemental resistance)", legion: "INT +10/20/40/80/100" },
  { name: "Arch Mage (Ice/Lightning)", region: "Explorers", summary: "Mage specializing in ice and lightning AoE spells.", difficulty: "Normal", link: "Elemental Decrease (-2/4/6% enemy elemental resistance)", legion: "INT +10/20/40/80/100" },
  { name: "Bishop", region: "Explorers", summary: "Support mage with healing, buffs, and holy damage.", difficulty: "Normal", link: "Blessed Ensemble (+EXP when in a party)", legion: "INT +10/20/40/80/100" },
  { name: "Bowmaster", region: "Explorers", summary: "Archer who rains down arrows with blazing speed.", difficulty: "Normal", link: "Adventurer's Curiosity (+10% crit rate)", legion: "DEX +10/20/40/80/100" },
  { name: "Marksman", region: "Explorers", summary: "Sniper archer with long-range, high-damage precision shots.", difficulty: "Normal", link: "Adventurer's Curiosity (+10% crit rate)", legion: "DEX +10/20/40/80/100" },
  { name: "Pathfinder", region: "Explorers", summary: "Ancient archer who channels relic powers through a bow.", difficulty: "Easy", link: "Adventurer's Curiosity (+10% crit rate)", legion: "DEX +10/20/40/80/100" },
  { name: "Night Lord", region: "Explorers", summary: "Throwing-star assassin with massive burst damage.", difficulty: "Normal", link: "Shadow Meld (chance to dodge attacks)", legion: "LUK +10/20/40/80/100" },
  { name: "Shadower", region: "Explorers", summary: "Dagger-wielding thief who strikes from the shadows.", difficulty: "Normal", link: "Shadow Meld (chance to dodge attacks)", legion: "LUK +10/20/40/80/100" },
  { name: "Dual Blade", region: "Explorers", summary: "Agile dual-wielding thief with flashy combo chains.", difficulty: "Normal", link: "Shadow Meld (chance to dodge attacks)", legion: "LUK +10/20/40/80/100" },
  { name: "Corsair", region: "Explorers", summary: "Gunslinger pirate with summoned crew and ship cannons.", difficulty: "Normal", link: "Pirate Blessing (+STR/DEX/INT/LUK and HP/MP)", legion: "Summon Duration +2/4/6/8/10%" },
  { name: "Cannoneer", region: "Explorers", summary: "Pirate blasting enemies with a massive hand cannon.", difficulty: "Easy", link: "Pirate Blessing (+STR/DEX/INT/LUK and HP/MP)", legion: "STR +10/20/40/80/100" },
  { name: "Buccaneer", region: "Explorers", summary: "Brawling pirate who fights with fists and transformation power.", difficulty: "Easy", link: "Pirate Blessing (+STR/DEX/INT/LUK and HP/MP)", legion: "STR +10/20/40/80/100" },
  // ── Cygnus Knights ──
  { name: "Dawn Warrior", region: "Cygnus Knights", summary: "Cygnus knight wielding the power of light and dark swords.", difficulty: "Hard", link: "True Sight (+10% crit rate, +5% boss damage at max)", legion: "HP +2/3/4/5/6%" },
  { name: "Blaze Wizard", region: "Cygnus Knights", summary: "Cygnus fire mage who controls orbital flames.", difficulty: "Hard", link: "Orbital Flame (+1 additional Flames for Blaze Wizards)", legion: "INT +10/20/40/80/100" },
  { name: "Wind Archer", region: "Cygnus Knights", summary: "Cygnus archer who commands the power of wind.", difficulty: "Normal", link: "Sylph's Aid (+10% knockback resistance)", legion: "DEX +10/20/40/80/100" },
  { name: "Night Walker", region: "Cygnus Knights", summary: "Cygnus assassin who strikes from darkness with throwing stars.", difficulty: "Hard", link: "Shadow Bat (summon bats that attack enemies)", legion: "LUK +10/20/40/80/100" },
  { name: "Thunder Breaker", region: "Cygnus Knights", summary: "Cygnus pirate channeling lightning through martial arts.", difficulty: "Hard", link: "Lightning Boost (+2/4/6% damage)", legion: "STR +10/20/40/80/100" },
  { name: "Mihile", region: "Cygnus Knights", summary: "Cygnus knight with a royal guard shield mechanic.", difficulty: "Hard", link: "Knight's Watch (+100% knockback resistance at max)", legion: "HP +2/3/4/5/6%" },
  // ── Heroes of Maple ──
  { name: "Aran", region: "Heroes of Maple", summary: "Polearm hero of legend with fast combo attacks.", difficulty: "Easy", link: "Combo Kill Blessing (+650% EXP for combo kills)", legion: "EXP +2/3/4/5/6%" },
  { name: "Evan", region: "Heroes of Maple", summary: "Dragon master who fights alongside the dragon Mir.", difficulty: "Normal", link: "Rune Mastery (+30% rune duration at max)", legion: "EXP +2/3/4/5/6%" },
  { name: "Mercedes", region: "Heroes of Maple", summary: "Elf queen with dual bowguns and acrobatic combos.", difficulty: "Hard", link: "Elven Blessing (+15% EXP at max)", legion: "Cooldown Skip +2/3/4/5/6%" },
  { name: "Phantom", region: "Heroes of Maple", summary: "Gentleman thief who steals and uses other classes' skills.", difficulty: "Hard", link: "Phantom Instinct (+15% crit rate at max)", legion: "Meso Obtained +2/3/4/5/6%" },
  { name: "Luminous", region: "Heroes of Maple", summary: "Mage of light and dark with screen-clearing attacks.", difficulty: "Easy", link: "Luminous Link (+15% IED at max)", legion: "INT +10/20/40/80/100" },
  { name: "Shade", region: "Heroes of Maple", summary: "Lonely spirit fighter with fox spirit powers.", difficulty: "Easy", link: "Close Call (chance to survive lethal attack at 1 HP)", legion: "Crit Damage +1/2/3/4/5%" },
  // ── Resistance ──
  { name: "Battle Mage", region: "Resistance", summary: "Resistance mage using a staff in close-range combat with auras.", difficulty: "Normal", link: "Battle Rage (+5% damage and +5% boss damage at max)", legion: "INT +10/20/40/80/100" },
  { name: "Wild Hunter", region: "Resistance", summary: "Resistance archer who rides a jaguar into battle.", difficulty: "Normal", link: "Wild Instinct (+4/8/12/16/20% damage)", legion: "Flat Damage +10/20/30/40/50" },
  { name: "Mechanic", region: "Resistance", summary: "Resistance engineer piloting a mech suit with gadgets.", difficulty: "Normal", link: "Mechanic Dash (+Buff Duration 5/10/15%)", legion: "Buff Duration +5/10/15/20/25%" },
  { name: "Blaster", region: "Resistance", summary: "Resistance warrior with a massive arm cannon and combo dashes.", difficulty: "Hard", link: "Arm Cannon Boost (+2/4/6% IED)", legion: "IED +1/2/3/5/6%" },
  { name: "Xenon", region: "Resistance", summary: "Hybrid thief/pirate android with three stat lines.", difficulty: "Normal", link: "Multilateral (+10% all stat at max)", legion: "STR/DEX/LUK +5/10/20/40/50" },
  // ── Demons ──
  { name: "Demon Slayer", region: "Demons", summary: "Demon warrior using Fury to unleash devastating axe attacks.", difficulty: "Easy", link: "Fury Unleashed (+15% boss damage at max)", legion: "Status Resistance +1/2/3/4/5" },
  { name: "Demon Avenger", region: "Demons", summary: "Demon who sacrifices HP instead of MP for powerful attacks.", difficulty: "Easy", link: "Wild Rage (+10% damage at max)", legion: "Boss Damage +1/2/3/5/6%" },
  // ── Nova ──
  { name: "Kaiser", region: "Nova", summary: "Dragon warrior who transforms into a powerful dragon form.", difficulty: "Normal", link: "Iron Will (+15% HP at max)", legion: "STR +10/20/40/80/100" },
  { name: "Angelic Buster", region: "Nova", summary: "Magical girl pirate with flashy energy blasts.", difficulty: "Easy", link: "Terms and Conditions (+60% skip chance at max)", legion: "DEX +10/20/40/80/100" },
  { name: "Cadena", region: "Nova", summary: "Chain-wielding thief with fast, fluid combo attacks.", difficulty: "Hard", link: "Cadena's Link (+6/12% damage to statused enemies)", legion: "LUK +10/20/40/80/100" },
  { name: "Kain", region: "Nova", summary: "Archer wielding a malice-infused weapon with transformation skills.", difficulty: "Normal", link: "Kain's Link (+3/6% damage)", legion: "DEX +10/20/40/80/100" },
  // ── Flora ──
  { name: "Illium", region: "Flora", summary: "Mage who commands crystal wings and magical constructs.", difficulty: "Normal", link: "Illium Link (+Damage when moving)", legion: "INT +10/20/40/80/100" },
  { name: "Ark", region: "Flora", summary: "Pirate who channels chaotic flora powers through martial arts.", difficulty: "Normal", link: "Ark Link (+1/2% damage per second in combat, up to 11%)", legion: "STR +10/20/40/80/100" },
  { name: "Adele", region: "Flora", summary: "Knight who summons ethereal swords to fight alongside her.", difficulty: "Easy", link: "Noble Fire (+2/4% damage + 1/2% boss damage)", legion: "STR +10/20/40/80/100" },
  { name: "Khali", region: "Flora", summary: "Thief who wields chakrams with swift aerial combos.", difficulty: "Normal", link: "Khali Link (+4/8% damage to normal monsters)", legion: "LUK +10/20/40/80/100" },
  // ── Anima ──
  { name: "Hoyoung", region: "Anima", summary: "Sage who uses talismans, clones, and flashy Eastern magic.", difficulty: "Hard", link: "Hoyoung Link (+7/14% IED)", legion: "LUK +10/20/40/80/100" },
  { name: "Lara", region: "Anima", summary: "Nature mage who channels mountain energy and bell magic.", difficulty: "Normal", link: "Lara Link (+3/6% damage)", legion: "INT +10/20/40/80/100" },
  // ── Other ──
  { name: "Zero", region: "Other", summary: "Tag-team duo wielding a sword and lapis — two characters in one.", difficulty: "Hard", link: "Rhinne's Blessing (+10% EXP at max)", legion: "EXP +2/3/4/5/6%" },
  { name: "Kinesis", region: "Other", summary: "Psychic who hurls objects and controls gravity with telekinesis.", difficulty: "Hard", link: "Kinesis Link (+4% crit damage)", legion: "INT +10/20/40/80/100" },
  { name: "Lynn", region: "Other", summary: "Swordswoman with a unique stance-switching combat system.", difficulty: "Normal", link: "Lynn Link (+3/6% boss damage)", legion: "STR +10/20/40/80/100" },
  // ── Sengoku ──
  { name: "Hayato", region: "Sengoku", summary: "Samurai with quick-draw sword techniques.", difficulty: "Normal", link: "Keen Edge (+10/15/25 all stat and +5/10/15% HP)", legion: "Crit Damage +1/2/3/4/5%" },
  { name: "Kanna", region: "Sengoku", summary: "Fox spirit mage with fan-based attacks and Kishin summons.", difficulty: "Normal", link: "Elementalism (+5/10% damage)", legion: "INT +10/20/40/80/100" },
  // ── Friends of Maple ──
  { name: "Beast Tamer", region: "Friends of Maple", summary: "Mage who summons animal companions to fight.", difficulty: "Easy", link: "Focus Spirit (+4/7/10% boss damage, +4/7/10% crit rate, +3/5/7% HP/MP)", legion: "Crit Rate +1/2/3/4/5%" },
];

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: "#2d8a2d",
  Normal: "#c49a2a",
  Hard: "#c44040",
};

function ClassRandomizer({ theme }: { theme: AppTheme }) {
  const [result, setResult] = useState<MapleClass | null>(null);

  function roll() {
    setResult(CLASSES[Math.floor(Math.random() * CLASSES.length)]);
  }

  return (
    <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
      <button
        onClick={roll}
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "0.85rem",
          padding: "0.6rem 1.25rem",
          borderRadius: "12px",
          border: "none",
          background: theme.accent,
          color: "#fff",
          cursor: "pointer",
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Randomize my class
      </button>

      {result && (
        <div
          className="class-card"
          style={{
            width: "100%",
            background: theme.accentSoft,
            border: `1px solid ${theme.border}`,
            borderRadius: "14px",
            padding: "1.25rem",
            display: "flex",
            gap: "1.25rem",
            alignItems: "flex-start",
          }}
        >
          {/* Portrait */}
          <div
            style={{
              width: "120px",
              minWidth: "120px",
              height: "120px",
              borderRadius: "12px",
              border: `1px solid ${theme.border}`,
              background: theme.panel,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {result.portrait ? (
              <Image
                src={result.portrait}
                alt={result.name}
                width={120}
                height={120}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "2.5rem" }}>⚔️</span>
            )}
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.05rem",
                color: theme.accent,
                marginBottom: "0.5rem",
              }}
            >
              {result.name}
            </div>

            <div style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 600, lineHeight: 1.6, marginBottom: "0.75rem" }}>
              {result.summary}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Difficulty:{" "}
                <span style={{ color: DIFFICULTY_COLORS[result.difficulty] }}>{result.difficulty}</span>
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Link Skill:{" "}
                <span style={{ fontWeight: 600, color: theme.muted }}>{result.link}</span>
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Legion:{" "}
                <span style={{ fontWeight: 600, color: theme.muted }}>{result.legion}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Expanded class info panel ─────────────────────────────────── */

function ClassInfoPanel({ cls, theme }: { cls: MapleClass; theme: AppTheme }) {
  return (
    <div
      className="class-card"
      style={{
        gridColumn: "1 / -1",
        background: theme.accentSoft,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "1.25rem",
        display: "flex",
        gap: "1.25rem",
        alignItems: "flex-start",
      }}
    >
      {/* Portrait */}
      <div
        style={{
          width: "100px",
          minWidth: "100px",
          height: "100px",
          borderRadius: "12px",
          border: `1px solid ${theme.border}`,
          background: theme.panel,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cls.portrait ? (
          <Image
            src={cls.portrait}
            alt={cls.name}
            width={100}
            height={100}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: "2rem" }}>⚔️</span>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "0.95rem",
            color: theme.accent,
            marginBottom: "0.4rem",
          }}
        >
          {cls.name}
        </div>
        <div style={{ fontSize: "0.8rem", color: theme.muted, fontWeight: 600, lineHeight: 1.6, marginBottom: "0.6rem" }}>
          {cls.summary}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Difficulty:{" "}
            <span style={{ color: DIFFICULTY_COLORS[cls.difficulty] }}>{cls.difficulty}</span>
          </div>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Link Skill:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{cls.link}</span>
          </div>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Legion:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{cls.legion}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Class directory by region ─────────────────────────────────── */

function ClassDirectory({ theme }: { theme: AppTheme }) {
  const [selected, setSelected] = useState<string | null>(null);

  const grouped = CLASS_REGIONS.map((region) => ({
    region,
    classes: CLASSES.filter((c) => c.region === region),
  })).filter((g) => g.classes.length > 0);

  function toggle(name: string) {
    setSelected((prev) => (prev === name ? null : name));
  }

  return (
    <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1rem",
          color: theme.text,
        }}
      >
        All Classes by Region
      </div>

      {grouped.map(({ region, classes }) => (
        <div key={region}>
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "0.85rem",
              color: theme.accent,
              marginBottom: "0.75rem",
            }}
          >
            {region}
          </div>
          <div
            className="class-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {classes.map((cls) => {
              const isSelected = selected === cls.name;
              return (
                <React.Fragment key={cls.name}>
                  <div
                    onClick={() => toggle(cls.name)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                      transform: isSelected ? "scale(1.05)" : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <div
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "10px",
                        border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                        background: theme.panel,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                        boxShadow: isSelected ? `0 0 0 2px ${theme.accentSoft}` : "none",
                      }}
                    >
                      {cls.portrait ? (
                        <Image
                          src={cls.portrait}
                          alt={cls.name}
                          width={72}
                          height={72}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "1.5rem", opacity: isSelected ? 1 : 0.4 }}>⚔️</span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: isSelected ? theme.accent : theme.text,
                        textAlign: "center",
                        lineHeight: 1.2,
                        transition: "color 0.2s ease",
                      }}
                    >
                      {cls.name}
                    </div>
                  </div>

                  {/* Expanded info panel — spans full grid width */}
                  {isSelected && <ClassInfoPanel cls={cls} theme={theme} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Components ────────────────────────────────────────────────── */

function SectionCard({
  section,
  theme,
  index,
  children,
}: {
  section: GuideSection;
  theme: AppTheme;
  index: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="fade-in"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "18px",
        padding: "2rem 1.75rem",
        animationDelay: `${index * 0.06}s`,
        animationFillMode: "both",
      }}
    >
      {/* Section heading */}
      <div
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1.15rem",
          color: theme.text,
          marginBottom: "1rem",
        }}
      >
        {section.title}
      </div>

      {/* Optional image */}
      {section.image && (
        <div
          style={{
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "1.25rem",
            border: `1px solid ${theme.border}`,
          }}
        >
          <Image
            src={section.image}
            alt={section.imageAlt || section.title}
            width={1000}
            height={500}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      )}

      {/* Body text */}
      <div
        style={{
          fontSize: "0.88rem",
          color: theme.muted,
          fontWeight: 600,
          lineHeight: 1.75,
          whiteSpace: "pre-line",
        }}
      >
        {section.body}
      </div>

      {children}
    </div>
  );
}

function NewPlayersContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        @media (max-width: 860px) {
          .guide-main { padding: 1rem !important; }
        }
        @media (max-width: 500px) {
          .class-card { flex-direction: column !important; align-items: center !important; text-align: center !important; }
        }
      `}</style>

      <div
        className="guide-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          {/* Back link */}
          <Link
            href="/guides"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: theme.accent,
              textDecoration: "none",
              marginBottom: "1.25rem",
            }}
          >
            ← Back to Guides
          </Link>

          {/* Page title */}
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.5rem",
              color: theme.text,
              marginBottom: "0.25rem",
            }}
          >
            New Players Guide
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: theme.muted,
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            Everything you need to know to get started in MapleStory
          </div>

          {/* Table of contents */}
          <div
            className="fade-in"
            style={{
              background: theme.accentSoft,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.75rem",
              }}
            >
              Contents
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: theme.accent,
                    textDecoration: "none",
                  }}
                >
                  {i + 1}. {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* Guide sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {SECTIONS.map((section, i) => (
              <div key={section.id} id={section.id}>
                <SectionCard section={section} theme={theme} index={i}>
                  {section.id === "choosing-class" && (
                    <>
                      <ClassRandomizer theme={theme} />
                      <ClassDirectory theme={theme} />
                    </>
                  )}
                </SectionCard>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function NewPlayersGuidePage() {
  return (
    <AppShell currentPath="/guides">
      {({ theme }) => <NewPlayersContent theme={theme} />}
    </AppShell>
  );
}
