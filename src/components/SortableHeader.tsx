"use client";

export default function SortableHeader<T extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
  align = "left",
  fullWidth = true,
}: {
  label: string;
  sortKey: T;
  activeKey: T;
  dir: "asc" | "desc";
  onClick: (key: T) => void;
  align?: "left" | "right";
  /** Table header cells stretch to fill their grid column; standalone sort chips (e.g. above a card grid) should size to content instead. */
  fullWidth?: boolean;
}) {
  const active = activeKey === sortKey;
  const arrow = <span className="text-[8px]">{dir === "asc" ? "▲" : "▼"}</span>;

  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-1 transition-colors hover:text-foreground ${fullWidth ? "w-full" : ""} ${
        align === "right" ? "justify-end" : "justify-start"
      } ${active ? "text-foreground" : ""}`}
    >
      {align === "right" && active && arrow}
      <span>{label}</span>
      {align === "left" && active && arrow}
    </button>
  );
}
