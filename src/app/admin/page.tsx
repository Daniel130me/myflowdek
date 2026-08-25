'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Building2, Activity, Heart, AlertTriangle, HardDrive, TrendingUp, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FONT_FAMILY as FF, COLORS } from '@/features/flowdeck/model';

/**
 * Internal Flowdeck Admin Dashboard.
 *
 * Accessible only by SUPER_ADMIN users. The API routes enforce this via
 * requireSuperAdmin(), so if a non-admin visits the page the API calls
 * will return 403 and the page will show an access-denied message.
 *
 * Shows:
 *   - Overview cards (users, workspaces, projects, tasks, storage, failed logins)
 *   - Users table (email, status, platformRole, onboarded, verified)
 *   - Workspaces table (name, members, projects)
 *   - Recent audit events
 *   - System health (DB latency, migrations)
 */

interface Overview {
  users: { total: number; active: number; disabled: number; deleted: number; onboarded: number; verified: number; newRegistrations7d: number };
  workspaces: number;
  projects: number;
  tasks: number;
  comments: number;
  files: number;
  storage: { bytesUsed: number; mbUsed: number };
  security: { failedLogins24h: number };
}

interface AdminUser {
  id: string; email: string; name: string | null; status: string; platformRole: string;
  emailVerifiedAt: string | null; onboardedAt: string | null; createdAt: string;
  _count: { workspaces: number; ownedProjects: number; assignedTasks: number };
}

interface AdminWorkspace {
  id: string; name: string; slug: string; createdAt: string;
  _count: { members: number; projects: number };
}

interface AuditEvent {
  id: string; action: string; ip: string | null; createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
}

interface SystemHealth {
  status: string; database: string; dbLatencyMs: number; migrations: number; timestamp: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ovRes, usersRes, wsRes, auditRes, healthRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/users?limit=20'),
        fetch('/api/admin/workspaces?limit=20'),
        fetch('/api/admin/audit?limit=20'),
        fetch('/api/admin/health'),
      ]);

      if (ovRes.status === 403) { setError('Super admin access required'); return; }

      if (ovRes.ok) setOverview(await ovRes.json());
      if (usersRes.ok) setUsers((await usersRes.json()).users ?? []);
      if (wsRes.ok) setWorkspaces((await wsRes.json()).workspaces ?? []);
      if (auditRes.ok) setAudit((await auditRes.json()).events ?? []);
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9CA3AF', fontFamily: FF }}>Loading admin dashboard…</div>;
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: FF }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={48} color="#DC2626" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2124', marginBottom: 8 }}>Access Denied</h2>
          <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 20 }}>{error}</p>
          <button onClick={() => router.push('/projects')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#FE8029', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FF }}>
            Go to app
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F7', fontFamily: FF, color: '#1F2124', padding: '32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Flowdeck Admin</h1>
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>Internal platform dashboard — SUPER_ADMIN only</p>
        </div>

        {/* Overview cards */}
        {overview && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon={Users} label="Total Users" value={overview.users.total} subtext={`${overview.users.active} active, ${overview.users.disabled} disabled`} color="#0891B2" />
            <StatCard icon={TrendingUp} label="New (7 days)" value={overview.users.newRegistrations7d} subtext={`${overview.users.onboarded} onboarded, ${overview.users.verified} verified`} color="#16A34A" />
            <StatCard icon={Building2} label="Workspaces" value={overview.workspaces} subtext={`${overview.projects} projects`} color="#7C3AED" />
            <StatCard icon={Activity} label="Tasks" value={overview.tasks} subtext={`${overview.comments} comments, ${overview.files} files`} color="#FE8029" />
            <StatCard icon={HardDrive} label="Storage" value={`${overview.storage.mbUsed} MB`} subtext={`${overview.files} files`} color="#D97706" />
            <StatCard icon={AlertTriangle} label="Failed Logins (24h)" value={overview.security.failedLogins24h} subtext="Security monitor" color="#DC2626" />
          </div>
        )}

        {/* System health */}
        {health && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 32, border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Heart size={18} color={health.status === 'healthy' ? '#16A34A' : '#DC2626'} />
              System Health
            </h2>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <HealthItem label="Status" value={health.status} color={health.status === 'healthy' ? '#16A34A' : '#DC2626'} />
              <HealthItem label="Database" value={health.database} color={health.database === 'connected' ? '#16A34A' : '#DC2626'} />
              <HealthItem label="DB Latency" value={`${health.dbLatencyMs}ms`} />
              <HealthItem label="Migrations" value={String(health.migrations)} />
            </div>
          </div>
        )}

        {/* Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          {/* Users */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Users</h2>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FE8029', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {u.email[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name ?? u.email}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: u.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: u.status === 'ACTIVE' ? '#16A34A' : '#DC2626' }}>
                    {u.status}
                  </span>
                  {u.platformRole === 'SUPER_ADMIN' && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#FEF3C7', color: '#D97706' }}>ADMIN</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Workspaces */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Workspaces</h2>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {workspaces.map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <Building2 size={16} color="#9CA3AF" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{w._count.members} members · {w._count.projects} projects</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit log */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Audit Events</h2>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {audit.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#F3F4F6', color: '#6B7280', minWidth: 100, textAlign: 'center' }}>
                  {e.action}
                </span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{e.user?.email ?? 'system'}</span>
                {e.ip && <span style={{ fontSize: 11, color: '#9CA3AF' }}>{e.ip}</span>}
                <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{new Date(e.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color }: { icon: any; label: string; value: string | number; subtext: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{subtext}</div>
    </div>
  );
}

function HealthItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? '#1F2124' }}>{value}</div>
    </div>
  );
}
