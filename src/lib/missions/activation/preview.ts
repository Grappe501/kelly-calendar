/**
 * IC-02B preview builder — pure; creates zero DB records.
 */

import {
  classifyWindow,
  computeDueAt,
} from "@/lib/missions/activation/timing";
import type {
  PlaybookLevel,
  PreviewTask,
  ScheduleContext,
  WorkstreamCode,
} from "@/lib/missions/activation/types";
import {
  getTemplateByLevel,
  recommendPlaybookLevel,
  type PlaybookTemplateDef,
} from "@/lib/missions/activation/templates";

export function buildActivationPreview(input: {
  playbookLevel: PlaybookLevel;
  enabledWorkstreams?: WorkstreamCode[] | null;
  schedule: ScheduleContext;
  now?: Date;
  recommendFrom?: {
    expectedAttendance?: number | null;
    isMultiDay?: boolean;
    hasMission?: boolean;
  };
}): {
  template: PlaybookTemplateDef;
  recommendedLevel: PlaybookLevel;
  tasks: PreviewTask[];
  workstreams: WorkstreamCode[];
  earliestDueAt: string | null;
  departments: string[];
  createsZeroRecords: true;
  externalActionsBlocked: true;
} {
  const now = input.now ?? new Date();
  const template = getTemplateByLevel(input.playbookLevel);
  const recommendedLevel = recommendPlaybookLevel(
    input.recommendFrom ?? { hasMission: true },
  );

  if (input.playbookLevel === "NONE" || template.steps.length === 0) {
    return {
      template,
      recommendedLevel,
      tasks: [],
      workstreams: [],
      earliestDueAt: null,
      departments: [],
      createsZeroRecords: true,
      externalActionsBlocked: true,
    };
  }

  const enabled = input.enabledWorkstreams
    ? new Set(input.enabledWorkstreams)
    : null;

  const tasks: PreviewTask[] = [];
  for (const step of template.steps) {
    if (enabled && !enabled.has(step.workstream)) continue;
    const dueAt = computeDueAt(step.timingAnchor, step.offsetHours, input.schedule);
    const windowLabel = classifyWindow(dueAt, now, input.schedule.eventStartsAt);
    tasks.push({
      stepKey: step.stepKey,
      department: step.department,
      workstream: step.workstream,
      title: step.title,
      instructions: step.instructions,
      timingAnchor: step.timingAnchor,
      dueAt,
      windowLabel,
      required: step.required !== false,
      requiresConsent: Boolean(step.requiresConsent),
      requiresContentApproval: Boolean(step.requiresContentApproval),
      requiresAudienceApproval: Boolean(step.requiresAudienceApproval),
      requiresExternalProvider: Boolean(step.requiresExternalProvider),
      volunteerEligible: Boolean(step.volunteerEligible),
      createVolunteerNeed: Boolean(step.createVolunteerNeed),
      externalActionBlocked: true,
    });
  }

  const workstreams = [...new Set(tasks.map((t) => t.workstream))];
  const departments = [...new Set(tasks.map((t) => t.department))];
  const dues = tasks
    .map((t) => t.dueAt)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    template,
    recommendedLevel,
    tasks,
    workstreams,
    earliestDueAt: dues[0]?.toISOString() ?? null,
    departments,
    createsZeroRecords: true,
    externalActionsBlocked: true,
  };
}
