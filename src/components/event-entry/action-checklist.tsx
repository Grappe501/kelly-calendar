"use client";

type Item = { id: string; label: string; checked: boolean };

type Props = {
  title: string;
  items: Item[];
  onChange: (items: Item[]) => void;
};

export function ActionChecklist({ title, items, onChange }: Props) {
  return (
    <section>
      <h3>{title}</h3>
      <div className="checkbox-grid compact">
        {items.map((item, index) => (
          <label key={item.id} className="check-inline">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) =>
                onChange(
                  items.map((row, i) =>
                    i === index ? { ...row, checked: e.target.checked } : row,
                  ),
                )
              }
            />{" "}
            {item.label}
          </label>
        ))}
      </div>
    </section>
  );
}
