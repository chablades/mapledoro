import { ItemIcon as ResourceItemIcon } from "../../../components/ResourceImage";

export function ItemIcon({ id }: { id: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      <ResourceItemIcon id={id} size={32} />
    </span>
  );
}
