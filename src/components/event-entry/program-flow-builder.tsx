"use client";

type FlowItem = { id: string; sequence: number; activity: string };

type Props = {
  items: FlowItem[];
  onReorder: (items: FlowItem[]) => void;
};

/** Accessible reorder controls (drag-and-drop deferred). */
export function ProgramFlowBuilder({ items, onReorder }: Props) {
  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next.map((item, i) => ({ ...item, sequence: i + 1 })));
  }

  return (
    <ul className="plain-list">
      {items.map((item, index) => (
        <li key={item.id}>
          <strong>{item.sequence}.</strong> {item.activity}{" "}
          <button type="button" className="chip-button" onClick={() => move(index, -1)}>
            Move up
          </button>{" "}
          <button type="button" className="chip-button" onClick={() => move(index, 1)}>
            Move down
          </button>
        </li>
      ))}
    </ul>
  );
}
