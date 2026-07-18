export function calculatePackingReadiness(items: Array<{
  state: string;
}>) {
  const required = items.filter((i) => i.state !== "NOT_NEEDED");
  const packed = required.filter((i) =>
    ["PACKED", "LOADED", "DELIVERED", "COMPLETED"].includes(i.state),
  );
  const loaded = required.filter((i) =>
    ["LOADED", "DELIVERED", "COMPLETED"].includes(i.state),
  );
  const delivered = required.filter((i) =>
    ["DELIVERED", "COMPLETED"].includes(i.state),
  );
  const missing = required.filter((i) => i.state === "MISSING" || i.state === "NEEDED");
  const blocked = required.filter((i) => i.state === "BLOCKED");
  const returned = required.filter((i) => i.state === "RETURNED");

  return {
    itemsRequired: required.length,
    itemsAssigned: required.filter((i) => i.state === "ASSIGNED" || packed.length).length,
    itemsPacked: packed.length,
    itemsLoaded: loaded.length,
    itemsDelivered: delivered.length,
    missingItems: missing.length,
    blockedItems: blocked.length,
    unreturnedItems: Math.max(0, delivered.length - returned.length),
    packingReadiness:
      required.length === 0 ? 100 : Math.round((packed.length / required.length) * 100),
    deliveryReadiness:
      required.length === 0 ? 100 : Math.round((delivered.length / required.length) * 100),
  };
}
