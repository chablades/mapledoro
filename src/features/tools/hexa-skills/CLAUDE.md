# HEXA Skills

**Icon URL:** `https://media.maplestorywiki.net/yetidb/Skill_{name}.png` — apostrophes → `%27`, colons stripped, spaces → `_`. `s(name)` auto-generates; `si(name, iconName)` overrides when wiki name differs. Bracket skills (`[Tian]`, `[Di]`, `[Shinsoku]`) have no CDN icons — use parenthesized overrides via `si()` or fall back to letter initial.

**Wiki HTML pages** (`maplestorywiki.net/w/*`) return 403 to programmatic clients. Use `curl` with a browser User-Agent.
