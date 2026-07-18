"use client";

type PackItem = { id: string; label: string; state: string };

type Props = {
  items: PackItem[];
  onChange: (items: PackItem[]) => void;
};

export function PackingChecklist({ items, onChange }: Props) {
  return (
    <div className="checkbox-grid">
      {items.map((item, index) => (
        <label key={item.id} className="check-inline">
          <input
            type="checkbox"
            checked={item.state !== "NOT_NEEDED"}
            onChange={(e) =>
              onChange(
                items.map((row, i) =>
                  i === index
                    ? { ...row, state: e.target.checked ? "NEEDED" : "NOT_NEEDED" }
                    : row,
                ),
              )
            }
          />{" "}
          {item.label}
        </label>
      ))}
    </div>
  );
}
