/**
 * DEMO seed script — populates the database with mock FlowDeck data.
 *
 * Run with: `npm run seed:demo` (a.k.a. `tsx prisma/seed.ts`)
 *
 * Creates 7 demo users (from TEAM), 2 projects, ~35 tasks, tags, comments,
 * files, RAID items, and time logs. All demo users share the password
 * defined by `DEMO_PASSWORD` (bcrypt-hashed) so login can be tested.
 *
 * ─── PRODUCTION SAFETY ───────────────────────────────────────────
 * This script DELETES all existing users, projects, tasks and related
 * records before inserting demo data. It will REFUSE to run unless BOTH
 * of the following are true:
 *
 *   1. NODE_ENV is not "production"
 *   2. ALLOW_DESTRUCTIVE_SEED === "true"
 *
 * This guard prevents accidental data loss on a real deployment.
 * ──────────────────────────────────────────────────────────────────
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  TEAM,
  INITIAL_PROJECTS,
  INITIAL_TAGS,
  initialTasks,
  initialComments,
  initialFiles,
  initialRaid,
  initialTimeLogs,
} from '../src/features/flowdeck/model/data';
import { DEMO_PASSWORD, BCRYPT_ROUNDS, DEMO_EMAIL_DOMAIN } from '../src/lib/auth.constants';

const prisma = new PrismaClient();

/** Hard production guard. Exits with a non-zero code (no data touched) if the
 *  environment is not explicitly authorised for a destructive demo seed. */
function assertDestructiveSeedAllowed(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const explicitlyAllowed = process.env.ALLOW_DESTRUCTIVE_SEED === 'true';

  if (isProduction || !explicitlyAllowed) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║  DEMO SEED BLOCKED                                          ║');
    console.error('╠══════════════════════════════════════════════════════════════╣');
    console.error('║  This script deletes all existing data before inserting     ║');
    console.error('║  demo records. It is blocked for safety.                    ║');
    console.error('║                                                             ║');
    if (isProduction) {
      console.error('║  Reason: NODE_ENV=production                               ║');
    } else {
      console.error('║  Reason: ALLOW_DESTRUCTIVE_SEED is not "true"              ║');
    }
    console.error('║                                                             ║');
    console.error('║  To run locally:  ALLOW_DESTRUCTIVE_SEED=true npm run seed:demo ║');
    console.error('║  Production runs are never allowed.                          ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }
}

/** Build a deterministic demo email from a display name
 *  (e.g. "Wale Johnson" -> "wale.johnson@flowdeck.io"). */
function emailFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, '.') + '@' + DEMO_EMAIL_DOMAIN;
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  // Hard guard — exits before touching any data if not authorised.
  assertDestructiveSeedAllowed();

  console.log('🔐 Hashing demo password…');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  console.log('🧹 Cleaning existing data…');
  // Delete in reverse dependency order to respect foreign keys.
  await prisma.timeLog.deleteMany();
  await prisma.raidItem.deleteMany();
  await prisma.file.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskTag.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log(`👥 Creating ${TEAM.length} users…`);
  const ownerId = 'u5'; // Wale Johnson (Project Manager) owns the projects
  for (const member of TEAM) {
    await prisma.user.create({
      data: {
        id: member.id,
        email: emailFromName(member.name),
        name: member.name,
        role: member.role,
        avatarColor: member.color,
        passwordHash,
      },
    });
  }

  console.log(`📁 Creating ${Object.keys(INITIAL_PROJECTS).length} projects…`);
  for (const [projectId, p] of Object.entries(INITIAL_PROJECTS)) {
    await prisma.project.create({
      data: {
        id: projectId,
        name: p.name,
        description: p.description ?? null,
        color: p.color,
        startDate: toDate(p.start),
        endDate: toDate(p.end),
        isFavorite: p.isFavorite ?? false,
        isArchived: p.isArchived ?? false,
        ownerId,
      },
    });

    // Project members
    const members = p.members ?? [];
    for (const userId of members) {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId,
          role: userId === ownerId ? 'owner' : 'member',
        },
      });
    }
  }

  console.log(`🏷️  Creating tags…`);
  for (const [projectId, tags] of Object.entries(INITIAL_TAGS)) {
    for (const tag of tags) {
      await prisma.tag.create({
        data: {
          id: tag.id,
          projectId,
          name: tag.name,
          color: tag.color,
        },
      });
    }
  }

  console.log(`✅ Creating tasks…`);
  let taskCount = 0;
  for (const [projectId, tasks] of Object.entries(initialTasks)) {
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      await prisma.task.create({
        data: {
          id: t.id,
          projectId,
          name: t.name,
          description: t.description ?? null,
          status: t.status,
          priority: t.priority,
          startDate: toDate(t.start),
          dueDate: toDate(t.dueDate),
          duration: t.duration,
          progress: t.progress,
          sortOrder: i,
          isMilestone: t.milestone ?? false,
          assigneeId: t.assignee,
          parentId: t.parentId ?? null,
          createdAt: toDate(t.createdAt) ?? new Date(),
        },
      });
      taskCount++;

      // Task tags
      if (t.tags) {
        for (const tagId of t.tags) {
          await prisma.taskTag.create({ data: { taskId: t.id, tagId } });
        }
      }
    }
  }

  console.log(`🔗 Creating task dependencies…`);
  let depCount = 0;
  for (const [, tasks] of Object.entries(initialTasks)) {
    for (const t of tasks) {
      for (const depId of t.deps) {
        await prisma.taskDependency.create({
          data: { taskId: t.id, dependsOnId: depId },
        });
        depCount++;
      }
    }
  }

  console.log(`💬 Creating comments…`);
  let commentCount = 0;
  for (const [projectId, comments] of Object.entries(initialComments)) {
    for (const c of comments) {
      await prisma.comment.create({
        data: {
          id: c.id,
          taskId: c.taskId,
          projectId,
          authorId: c.authorId,
          text: c.text,
          createdAt: toDate(c.createdAt) ?? new Date(),
        },
      });
      commentCount++;
    }
  }

  console.log(`📄 Creating files…`);
  let fileCount = 0;
  for (const [projectId, files] of Object.entries(initialFiles)) {
    for (const f of files) {
      await prisma.file.create({
        data: {
          id: f.id,
          projectId,
          taskId: f.linkedTaskId,
          name: f.name,
          size: f.size,
          uploadedById: f.uploadedBy,
          uploadedAt: toDate(f.uploadedAt) ?? new Date(),
          thumbnailUrl: f.thumbnailUrl ?? null,
        },
      });
      fileCount++;
    }
  }

  console.log(`⚠️  Creating RAID items…`);
  let raidCount = 0;
  for (const [projectId, items] of Object.entries(initialRaid)) {
    for (const r of items) {
      await prisma.raidItem.create({
        data: {
          id: r.id,
          projectId,
          type: r.type,
          description: r.description,
          ownerId: r.owner,
          impact: r.impact,
          status: r.status,
          dateRaised: toDate(r.dateRaised) ?? new Date(),
        },
      });
      raidCount++;
    }
  }

  console.log(`⏱️  Creating time logs…`);
  let logCount = 0;
  for (const [projectId, logs] of Object.entries(initialTimeLogs)) {
    for (const tl of logs) {
      await prisma.timeLog.create({
        data: {
          id: tl.id,
          taskId: tl.taskId,
          projectId,
          userId: tl.userId,
          minutes: tl.minutes,
          note: tl.note,
          loggedAt: toDate(tl.loggedAt) ?? new Date(),
        },
      });
      logCount++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅  SEED COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Users:          ${TEAM.length}`);
  console.log(`   Projects:       ${Object.keys(INITIAL_PROJECTS).length}`);
  console.log(`   Tasks:          ${taskCount}`);
  console.log(`   Dependencies:   ${depCount}`);
  console.log(`   Tags:           ${Object.values(INITIAL_TAGS).reduce((n, t) => n + t.length, 0)}`);
  console.log(`   Comments:       ${commentCount}`);
  console.log(`   Files:          ${fileCount}`);
  console.log(`   RAID items:     ${raidCount}`);
  console.log(`   Time logs:      ${logCount}`);
  console.log('───────────────────────────────────────────────────────');
  console.log('   Demo login (any user below):');
  console.log(`   Password:       ${DEMO_PASSWORD}`);
  console.log('   Example emails:');
  for (const m of TEAM.slice(0, 3)) {
    console.log(`     • ${emailFromName(m.name)}  (${m.name}, ${m.role})`);
  }
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
