/**
 * Client-side contract for the RAID log API (`/api/projects/:id/raid`).
 *
 * C-01 fix: RAID entries used to live only in React state — every item was
 * silently destroyed on refresh. The store and the `useProjectRaid` sync
 * hook both need to translate the API rows into the frontend `RaidItem`
 * shape, so the mapper lives here (model layer = shared, React-free).
 *
 * The canonical value sets for `type` / `impact` / `status` are defined
 * server-side in `src/server/raid/raid.service.ts`; the UI mirrors them in
 * `RAID_ORDER` / `IMPACT_META` and the status `<select>` options.
 */
import type { RaidItem } from './types';

/** Row shape returned by the RAID API endpoints (Prisma JSON). */
export interface ApiRaidItem {
  id: string;
  projectId: string;
  type: string;
  description: string;
  /** Nullable — the owner can be unassigned. */
  ownerId: string | null;
  impact: string;
  status: string;
  /** Full ISO timestamp; the UI model keeps only the date part. */
  dateRaised: string;
}

/** Payload the UI collects when logging a new item (id/dates are server-owned). */
export interface CreateRaidItemInput {
  type: string;
  description: string;
  /** User id or '' for unassigned. */
  owner: string;
  impact: string;
}

/** Editable fields on an existing item — what `updateRaidItem` may patch. */
export type UpdateRaidItemPatch = Partial<
  Pick<RaidItem, 'type' | 'description' | 'owner' | 'impact' | 'status'>
>;

/** Translate an API row into the frontend `RaidItem` shape. */
export function mapApiRaidItem(row: ApiRaidItem): RaidItem {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    owner: row.ownerId ?? '',
    impact: row.impact,
    status: row.status,
    dateRaised: row.dateRaised.slice(0, 10),
  };
}
