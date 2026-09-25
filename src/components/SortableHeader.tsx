"use client";

export default function SortableHeader<T extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  sortKey: T;
  activeKey: T;
  dir: "asc" | "desc";
  onClick: (key: T) => void;
  align?: "left" | "right";
}) {
  const active = activeKey === sortKey;
  const arrow = <span className="text-[8px]">{dir === "asc" ? "▲" : "▼"}</span>;

  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={`flex w-full items-center gap-1 transition-colors hover:text-foreground ${
        align === "right" ? "justify-end" : "justify-start"
      } ${active ? "text-foreground" : ""}`}
    >
      {align === "right" && active && arrow}
      <span>{label}</span>
      {align === "left" && active && arrow}
    </button>
  );
}
