import {
  readCharactersStore,
  writeCharactersStore,
  selectCharacterByIgn,
} from "../characters/model/charactersStore";

export function readCharacterToolData<T>(charName: string, toolKey: string): T | null {
  const store = readCharactersStore();
  const char = selectCharacterByIgn(store, charName);
  if (!char?.tools) return null;
  const data = char.tools[toolKey];
  return data != null ? (data as T) : null;
}

export function writeCharacterToolData(charName: string, toolKey: string, data: unknown): void {
  const store = readCharactersStore();
  const char = selectCharacterByIgn(store, charName);
  if (!char) return;
  const key = store.order.find(
    (id) => store.charactersById[id] === char,
  );
  if (!key) return;
  store.charactersById[key] = {
    ...char,
    tools: { ...char.tools, [toolKey]: data },
  };
  writeCharactersStore(store);
}
