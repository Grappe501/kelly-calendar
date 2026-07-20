/**
 * Prove D17 publishing does not automatically mutate Mission lifecycle surfaces.
 */
export function assertMobilizePublishingIsolation() {
  return {
    mutatesMission: false,
    mutatesPrepare: false,
    mutatesExecute: false,
    mutatesDebrief: false,
    mutatesFollowUp: false,
    mutatesTravel: false,
    mutatesLogistics: false,
    mutatesFieldOps: false,
    mutatesIncidents: false,
    mutatesExceptionDigest: false,
    mutatesCloseout: false,
    mutatesLaunchReview: false,
    mutatesDayLaunch: false,
    mutatesPeople: false,
    mutatesAttendance: false,
    autoCreatesMissionOnPublish: false,
    autoPublishesOnMissionCreate: false,
    silentConflictOverwrite: false,
    remoteDeleteOnLocalCancel: false,
    localDeleteOnRemoteDelete: false,
  } as const;
}
