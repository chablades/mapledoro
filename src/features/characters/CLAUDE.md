# Character Store API

Located in `model/charactersStore.ts`:

- `readCharactersStore()` → `CharactersStore` — reads from localStorage
- `selectCharactersList(store)` → `StoredCharacterRecord[]` — ordered list
- Characters are uniquely identified by `characterName` (lowercased as the store key)
- **`characterID` (number) is NOT unique** — never use as React key or option value
- Read characters fresh each render (not cached in `useState`) so new additions appear immediately
