"use client";

import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import { resourceImageUrl } from "../../../lib/mapleResource";
import type {
  ClassConfig,
  NodeType,
  Skill,
  StatPart,
  Tier,
} from "./guide-types";
import styles from "./ClassGuide.module.css";

/* ── Theme mapping ──────────────────────────────────────── */

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function rootVars(theme: AppTheme, accent: string): CSSProperties {
  return {
    "--cg-bg": theme.bg,
    "--cg-panel": theme.panel,
    "--cg-panel2": theme.timerBg,
    "--cg-line": theme.border,
    "--cg-text": theme.text,
    "--cg-dim": theme.muted,
    "--cg-faint": theme.muted,
    "--cg-accent": accent,
    "--cg-accent-soft": hexToRgba(accent, 0.14),
  } as CSSProperties;
}

/* ── Node-type metadata (legend, tooltip tag, cell tint) ── */

const NODE_META: Record<NodeType, { label: string; varName: string }> = {
  origin: { label: "Origin", varName: "--cg-origin" },
  mastery: { label: "Mastery", varName: "--cg-mastery" },
  boost: { label: "Boost", varName: "--cg-boost" },
  common: { label: "Common", varName: "--cg-common" },
};

const NODE_CELL: Record<NodeType, string> = {
  origin: styles.cellOrigin,
  mastery: styles.cellMastery,
  boost: styles.cellBoost,
  common: styles.cellCommon,
};

const COND_CLASS: Record<NonNullable<StatPart["cond"]>, string> = {
  temp: styles.condTemp,
  orb: styles.condOrb,
  debuff: styles.condDebuff,
  axe: styles.condAxe,
};

const TIER_CLASS: Record<Tier, string> = {
  leg: styles.tierLeg,
  unq: styles.tierUnq,
  epc: styles.tierEpc,
};

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Skill tooltip (single shared element) ──────────────── */

interface TipApi {
  show: (skill: Skill, el: HTMLElement) => void;
  hide: () => void;
}

const TipContext = createContext<TipApi>({ show: () => undefined, hide: () => undefined });
const useTip = () => useContext(TipContext);

interface TipState {
  skill: Skill;
  cx: number;
  top: number;
  below: boolean;
}

function tooltipTag(skill: Skill): { label: string; color: string; bg: string } {
  if (skill.nodeType) {
    const m = NODE_META[skill.nodeType];
    return { label: m.label, color: `var(${m.varName})`, bg: `var(${m.varName}-bg)` };
  }
  return { label: "Buff", color: "var(--cg-dim)", bg: "var(--cg-panel2)" };
}

function SkillTooltip({ tip }: { tip: TipState }) {
  const tag = tooltipTag(tip.skill);
  const style: CSSProperties = {
    left: tip.cx,
    top: tip.top,
    transform: `translate(-50%, ${tip.below ? "0" : "-100%"})`,
  };
  return (
    <div className={styles.tip} style={style} role="tooltip">
      <div className={styles.tipName}>
        {tip.skill.name}
        <span className={styles.tipTag} style={{ color: tag.color, background: tag.bg }}>
          {tag.label}
        </span>
      </div>
      {tip.skill.desc && <div className={styles.tipDesc}>{tip.skill.desc}</div>}
    </div>
  );
}

/* ── Icons (letter fallback on error) ───────────────────── */

function FallbackImg({ src, letter, size }: { src: string; letter: string; size: number }) {
  return (
    <>
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="pixelated-img"
        style={{ width: size, height: size, objectFit: "contain" }}
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          const fb = img.nextElementSibling as HTMLElement | null;
          if (fb) fb.style.display = "flex";
        }}
      />
      <span
        className={styles.fb}
        aria-hidden
        style={{ display: "none", width: size, height: size, fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </span>
    </>
  );
}

function SkillImage({ skill, size }: { skill: Skill; size: number }) {
  const letter = (skill.name[0] ?? "?").toUpperCase();
  if (!skill.iconId) {
    return (
      <span
        className={styles.fb}
        aria-hidden
        style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </span>
    );
  }
  return <FallbackImg src={resourceImageUrl("skill", skill.iconId, "icon.png")} letter={letter} size={size} />;
}

// Tooltip-triggering wrapper around any icon content. Reachable by keyboard;
// tapping a focusable element also surfaces the tooltip on touch devices.
function SkillTrigger({
  skill,
  className,
  ariaLabel,
  children,
}: {
  skill: Skill;
  className: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const tip = useTip();
  return (
    <span
      className={className}
      tabIndex={0}
      role="img"
      aria-label={ariaLabel ?? skill.name}
      onMouseEnter={(e) => tip.show(skill, e.currentTarget)}
      onMouseLeave={tip.hide}
      onFocus={(e) => tip.show(skill, e.currentTarget)}
      onBlur={tip.hide}
    >
      {children}
    </span>
  );
}

/* ── Section nav ────────────────────────────────────────── */

const NAV_ITEMS: { id: string; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "essentials", label: "Essentials" },
  { id: "sequence", label: "Sequence" },
  { id: "hexa", label: "HEXA" },
  { id: "utility", label: "Utility" },
  { id: "stats", label: "Stats" },
  { id: "links", label: "Link Skills" },
  { id: "resources", label: "Resources" },
];

function SectionNav() {
  return (
    <nav className={styles.nav} aria-label="Class guide sections">
      <div className={styles.navIn}>
        <Link href="/guides/character-guides" className={styles.back}>
          ← Guides
        </Link>
        {NAV_ITEMS.map((item) => (
          <a key={item.id} className={styles.navLink} href={`#${item.id}`}>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/* ── Header + quick facts ───────────────────────────────── */

function Stars({ n }: { n: number }) {
  return (
    <>
      <span className={styles.stars} aria-hidden>
        {"★".repeat(n)}
        <span className={styles.off}>{"★".repeat(5 - n)}</span>
      </span>
      <span className={styles.srOnly}>{n} of 5</span>
    </>
  );
}

function ClassHeader({ config }: { config: ClassConfig }) {
  return (
    <header className={styles.hero} id="overview">
      <div className={styles.heroRow}>
        <div className={styles.portrait}>
          {config.portraitUrl ? (
            <FallbackImg src={config.portraitUrl} letter={config.name[0]} size={84} />
          ) : (
            <span className={styles.fb} aria-hidden style={{ fontSize: 32 }}>
              {config.name[0]}
            </span>
          )}
        </div>
        <div>
          <h1 className={styles.hName}>{config.name}</h1>
          <div className={styles.hSub}>
            <span className={styles.tag}>
              {config.branch} · {config.archetype}
            </span>
          </div>
          <p className={styles.hDesc}>{config.description}</p>
        </div>
        <div className={styles.diff}>
          <span className={styles.diffRow}>
            Bossing <Stars n={config.difficulty.bossing} />
          </span>
          <span className={styles.diffRow}>
            Mobbing <Stars n={config.difficulty.mobbing} />
          </span>
        </div>
      </div>
    </header>
  );
}

function QuickFacts({ config }: { config: ClassConfig }) {
  return (
    <div className={cx(styles.grid, styles.facts)}>
      {config.facts.map((fact) => (
        <div key={fact.label} className={styles.fact}>
          <div className={styles.lbl}>{fact.label}</div>
          <div className={styles.factV}>
            {fact.itemIds?.map((id) => (
              <FallbackImg
                key={id}
                src={resourceImageUrl("item", id, "iconRaw.png")}
                letter={fact.label[0]}
                size={26}
              />
            ))}
            {fact.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Info row ───────────────────────────────────────────── */

function LinkSkillCard({ config }: { config: ClassConfig }) {
  const ls = config.linkSkill;
  return (
    <section className={styles.card} id="essentials">
      <h2 className={styles.secT}>Link skill</h2>
      <div className={styles.lsName}>
        {ls.iconId && (
          <FallbackImg src={resourceImageUrl("skill", ls.iconId, "icon.png")} letter={ls.name[0]} size={30} />
        )}
        {ls.name}
      </div>
      <p className={styles.muted}>{ls.desc}</p>
      <div className={styles.pillRow}>
        {ls.pills.map((p) => (
          <span key={p[0]} className={styles.pill}>
            {p[0]} <b>{p[1]}</b> · {p[2]}
          </span>
        ))}
      </div>
      {ls.note && <p className={styles.foot}>{ls.note}</p>}
    </section>
  );
}

function LegionCard({ config }: { config: ClassConfig }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.secT}>Legion bonus</h2>
      <p className={styles.legionVal}>{config.legion}</p>
      {config.weaponNote && <p className={styles.foot}>{config.weaponNote}</p>}
    </section>
  );
}

function InnerAbilityCard({ config }: { config: ClassConfig }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.secT}>Inner ability</h2>
      {config.innerAbility.map((line) => (
        <div key={line.tier} className={styles.iaRow}>
          <span className={cx(styles.tier, TIER_CLASS[line.tier])}>{line.tag}</span>
          {line.text}
        </div>
      ))}
    </section>
  );
}

function HyperStats({ config }: { config: ClassConfig }) {
  return (
    <section className={styles.card}>
      <div className={styles.hyper}>
        <h2 className={styles.secT} style={{ margin: 0 }}>
          Hyper stats
        </h2>
        {config.hyperStats.map((stat, i) => (
          <Fragment key={stat}>
            {i > 0 && <span className={styles.gt} aria-hidden>›</span>}
            <span className={styles.pill}>{stat}</span>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

/* ── Sequence ───────────────────────────────────────────── */

function Sequence({ config }: { config: ClassConfig }) {
  return (
    <section className={styles.card} id="sequence">
      <h2 className={styles.secT}>Sequence</h2>
      <div className={styles.rail}>
        {config.sequence.map((step, i) => {
          const skill = config.skills[step.skill];
          return (
            <Fragment key={`${step.skill}-${i}`}>
              {i > 0 && <span className={styles.chev} aria-hidden>›</span>}
              <div className={styles.cast}>
                {step.cd && <span className={styles.cdTag}>{step.cd}</span>}
                <SkillTrigger
                  skill={skill}
                  className={cx(styles.sk, skill.nodeType === "origin" && styles.skOrigin)}
                >
                  <SkillImage skill={skill} size={34} />
                </SkillTrigger>
                <span className={styles.castNm}>{skill.name}</span>
              </div>
            </Fragment>
          );
        })}
      </div>
      {config.seqNote && <p className={styles.foot}>{config.seqNote}</p>}
    </section>
  );
}

/* ── Leveling order ─────────────────────────────────────── */

const WORLDS = ["heroic", "interactive"] as const;
type World = (typeof WORLDS)[number];

function LevelingOrder({ config }: { config: ClassConfig }) {
  const [world, setWorld] = useState<World>("heroic");
  const steps = config.leveling[world];

  const legend = useMemo(() => {
    const map = new Map<NodeType, string[]>();
    for (const [key] of steps) {
      const skill = config.skills[key];
      const nt = skill.nodeType;
      if (!nt) continue;
      const names = map.get(nt) ?? [];
      if (!names.includes(skill.name)) names.push(skill.name);
      map.set(nt, names);
    }
    return [...map];
  }, [steps, config.skills]);

  return (
    <section className={styles.card} id="hexa">
      <div className={styles.lvlHead}>
        <h2 className={styles.secT} style={{ margin: 0 }}>
          6th job leveling order
        </h2>
        <div className={styles.tgl} role="tablist" aria-label="World type">
          {WORLDS.map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={world === w}
              className={world === w ? styles.on : undefined}
              onClick={() => setWorld(w)}
            >
              {w === "heroic" ? "Heroic" : "Interactive"}
            </button>
          ))}
        </div>
      </div>

      {steps.length === 0 ? (
        <p className={styles.muted} style={{ fontStyle: "italic" }}>
          Coming soon
        </p>
      ) : (
        <>
          <div className={styles.lvlGrid}>
            {steps.map(([key, lv], i) => {
              const skill = config.skills[key];
              const nt = skill.nodeType ?? "common";
              return (
                <div key={`${key}-${i}`} className={cx(styles.cell, NODE_CELL[nt])}>
                  <div className={styles.cellN}>{i + 1}</div>
                  <SkillTrigger skill={skill} className={styles.sk} ariaLabel={`${skill.name}, level ${lv}`}>
                    <SkillImage skill={skill} size={28} />
                  </SkillTrigger>
                  <div className={styles.lv}>Lv {lv}</div>
                </div>
              );
            })}
          </div>
          <div className={styles.legend}>
            {legend.map(([nt, names]) => (
              <span key={nt}>
                <span className={styles.dot} style={{ background: `var(${NODE_META[nt].varName})` }} />
                <b style={{ color: `var(${NODE_META[nt].varName})` }}>{NODE_META[nt].label}</b> — {names.join(" · ")}
              </span>
            ))}
          </div>
        </>
      )}
      {config.lvlFoot && <p className={styles.foot}>{config.lvlFoot}</p>}
    </section>
  );
}

/* ── Utility ────────────────────────────────────────────── */

function Utility({ config }: { config: ClassConfig }) {
  return (
    <div className={cx(styles.grid, styles.util)} id="utility">
      {config.utility.map((group) => (
        <section key={group.label} className={styles.card}>
          <h2 className={styles.secT}>{group.label}</h2>
          {group.rows.map((row, i) => {
            const skill = config.skills[row.skill];
            return (
              <div key={`${row.skill}-${i}`} className={styles.uLine}>
                <SkillTrigger skill={skill} className={styles.uIcon}>
                  <SkillImage skill={skill} size={22} />
                </SkillTrigger>
                {skill.name}
                <span className={styles.uTiming}>{row.timing}</span>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/* ── Base stats from skills ─────────────────────────────── */

const BASE_STATS_LEGEND: { dot: string; tag?: string; tagColor?: string; text: string }[] = [
  { dot: "var(--cg-dim)", text: "Untagged — permanent / near-permanent" },
  { dot: "var(--cg-mastery)", tag: "ORB", tagColor: "var(--cg-mastery)", text: "per Combo Orb" },
  { dot: "var(--cg-boost)", tag: "TEMP", tagColor: "var(--cg-boost)", text: "cooldown buff" },
  { dot: "var(--cg-uniq)", tag: "DEBUFF", tagColor: "var(--cg-uniq)", text: "vs debuffed enemies" },
  { dot: "var(--cg-accent)", tag: "AXE", tagColor: "var(--cg-accent)", text: "axe equipped" },
];

function StatPartChip({ part, skill }: { part: StatPart; skill: Skill }) {
  const condSuffix = part.cond ? ` (${part.cond})` : "";
  const ariaLabel = `${skill.name} ${part.value}${condSuffix}`;
  return (
    <SkillTrigger skill={skill} className={styles.part} ariaLabel={ariaLabel}>
      <SkillImage skill={skill} size={22} />
      <span className={styles.partV}>{part.value}</span>
      {part.cond && <span className={cx(styles.cond, COND_CLASS[part.cond])}>{part.cond.toUpperCase()}</span>}
    </SkillTrigger>
  );
}

function BaseStats({ config }: { config: ClassConfig }) {
  return (
    <section className={styles.card} id="stats">
      <h2 className={styles.secT}>Base stats from skills</h2>
      <p className={styles.muted} style={{ marginBottom: "0.25rem" }}>
        {config.baseStats.note}
      </p>
      {config.baseStats.rows.map((row) => (
        <div key={row.stat} className={styles.bsRow}>
          <div className={styles.bsStat}>
            <div className={styles.bsStatS}>{row.stat}</div>
            <div className={styles.bsTot}>{row.total}</div>
            {row.sub && <div className={styles.bsSub}>{row.sub}</div>}
          </div>
          <div className={styles.bsParts}>
            {row.parts.length === 0 ? (
              <span className={styles.muted}>Innate to the class — no skill sources</span>
            ) : (
              row.parts.map((part, i) => (
                <StatPartChip key={`${part.skill}-${i}`} part={part} skill={config.skills[part.skill]} />
              ))
            )}
          </div>
        </div>
      ))}
      <div className={styles.legend}>
        {BASE_STATS_LEGEND.map((entry) => (
          <span key={entry.text}>
            <span className={styles.dot} style={{ background: entry.dot }} />
            {entry.tag ? (
              <b style={{ color: entry.tagColor }}>{entry.tag}</b>
            ) : (
              <b>Untagged</b>
            )}{" "}
            — {entry.text}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── Recommended links ──────────────────────────────────── */

const MODES = ["bossing", "mobbing"] as const;
type Mode = (typeof MODES)[number];

function RecommendedLinks({ config }: { config: ClassConfig }) {
  const [mode, setMode] = useState<Mode>("bossing");
  const links = config.recLinks[mode];

  return (
    <section className={styles.card} id="links">
      <div className={styles.lvlHead}>
        <h2 className={styles.secT} style={{ margin: 0 }}>
          Recommended link skills
        </h2>
        <div className={styles.tgl} role="tablist" aria-label="Link skill mode">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={mode === m ? styles.on : undefined}
              onClick={() => setMode(m)}
            >
              {m === "bossing" ? "Bossing" : "Mobbing"}
            </button>
          ))}
        </div>
      </div>
      {links.length === 0 ? (
        <p className={styles.muted} style={{ fontStyle: "italic" }}>
          Coming soon
        </p>
      ) : (
        <div className={styles.rl}>
          {links.map((link, i) => (
            <div key={link[0]} className={styles.rlItem}>
              <span className={styles.rlRank}>{i + 1}</span>
              {link[0]}
              <span className={styles.rlFx}>{link[1]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Community resources ────────────────────────────────── */

const RES_CLASS: Record<string, string> = {
  wiki: styles.resWiki,
  disc: styles.resDisc,
  doc: styles.resDoc,
};

function CommunityResources({ config }: { config: ClassConfig }) {
  return (
    <section className={styles.card} id="resources">
      <h2 className={styles.secT}>Community resources</h2>
      <div className={styles.res}>
        {config.resources.map((r) => (
          <a key={r.label} className={RES_CLASS[r.kind]} href={r.url} target="_blank" rel="noopener noreferrer">
            {r.label}
          </a>
        ))}
      </div>
      <p className={styles.credit}>
        Data structure inspired by Grandis Library &amp; community infographics. Class images and data sourced from{" "}
        <a href="https://maplestory.nexon.net" target="_blank" rel="noopener noreferrer">
          Nexon
        </a>
        .
      </p>
    </section>
  );
}

/* ── Main export ────────────────────────────────────────── */

export function ClassGuide({ config, theme }: { config: ClassConfig; theme: AppTheme }) {
  const [tip, setTip] = useState<TipState | null>(null);

  const api = useMemo<TipApi>(
    () => ({
      show: (skill, el) => {
        const r = el.getBoundingClientRect();
        const cxPos = Math.max(140, Math.min(r.left + r.width / 2, window.innerWidth - 140));
        const below = r.top < 140;
        setTip({ skill, cx: cxPos, top: below ? r.bottom + 8 : r.top - 8, below });
      },
      hide: () => setTip(null),
    }),
    [],
  );

  useEffect(() => {
    const onScroll = () => setTip(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTip(null);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <TipContext.Provider value={api}>
      <div className={styles.root} style={rootVars(theme, config.accentColor)}>
        <SectionNav />
        <div className={styles.wrap}>
          <ClassHeader config={config} />
          <QuickFacts config={config} />

          <div className={cx(styles.grid, styles.info)}>
            <LinkSkillCard config={config} />
            <LegionCard config={config} />
            <InnerAbilityCard config={config} />
          </div>

          <HyperStats config={config} />
          <Sequence config={config} />
          <LevelingOrder config={config} />
          <Utility config={config} />
          <BaseStats config={config} />
          <RecommendedLinks config={config} />
          <CommunityResources config={config} />
        </div>
      </div>
      {tip && <SkillTooltip tip={tip} />}
    </TipContext.Provider>
  );
}
