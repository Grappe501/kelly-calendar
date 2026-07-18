export function calculateCommunicationsReadiness(items: Array<{
  status: string;
  approvalStatus?: string | null;
  publishAt?: Date | string | null;
  ownerUserId?: string | null;
}>) {
  const required = items;
  const draft = required.filter((i) => /draft|not_started/i.test(i.status));
  const approved = required.filter((i) => /approved|published/i.test(i.approvalStatus ?? i.status));
  const published = required.filter((i) => /published/i.test(i.status));
  const missingOwners = required.filter((i) => !i.ownerUserId);
  const now = Date.now();
  const overdue = required.filter((i) => {
    if (!i.publishAt) return false;
    const t = typeof i.publishAt === "string" ? Date.parse(i.publishAt) : i.publishAt.getTime();
    return t < now && !/published|complete/i.test(i.status);
  });

  return {
    requiredCommunicationsItems: required.length,
    draftStatusCount: draft.length,
    approvalStatusCount: approved.length,
    publicationStatusCount: published.length,
    overdueItems: overdue.length,
    missingOwners: missingOwners.length,
    communicationsReadiness:
      required.length === 0
        ? 100
        : Math.round((published.length / required.length) * 100),
  };
}
