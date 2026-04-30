# Characters

- Characters are uniquely identified by `characterName` (lowercased as store key)
- **`characterID` (number) is NOT unique** — never use as React key or option value
- Read characters fresh each render (not cached in `useState`) so new additions appear immediately
