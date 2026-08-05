'use client';

import React from 'react';
import Link from 'next/link';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { routes } from '@/shared/navigation/routes';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 400, padding: 32, textAlign: 'center', fontFamily: FF,
    }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
        Resource or Page Not Found
      </h2>
      <p style={{ fontSize: 14, color: '#6B7280', maxWidth: 440, marginBottom: 20 }}>
        The project, task, view, or file you were looking for could not be found or does not exist.
      </p>
      <Link
        href={routes.projects()}
        style={{
          background: '#FE8029', color: '#FFFFFF', borderRadius: 10,
          padding: '10px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}
      >
        Return to Projects
      </Link>
    </div>
  );
}
