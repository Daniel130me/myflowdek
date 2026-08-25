/**
 * Activity entry types — machine codes for the `ActivityEntry.type` field.
 *
 * Each maps to a human-readable description template. The description is
 * pre-rendered at write time so the feed is cheap to read (no joins needed
 * to build the sentence), but the `meta` JSON holds structured before/after
 * values for programmatic consumers.
 */
export const ACTIVITY_TYPES = {
  CREATED: 'created',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  STATUS_CHANGE: 'status_change',
  PRIORITY_CHANGE: 'priority_change',
  DUE_DATE_CHANGE: 'due_date_change',
  NAME_CHANGE: 'name_change',
  DESCRIPTION_CHANGE: 'description_change',
  COMPLETED: 'completed',
  REOPENED: 'reopened',
  COMMENT_ADDED: 'comment_added',
  FILE_UPLOADED: 'file_uploaded',
  MEMBER_ADDED: 'member_added',
} as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];
