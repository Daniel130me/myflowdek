import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#F7F7F7', color: '#1F2124' }}>
      <h1 style={{ fontSize: '48px', margin: '0 0 16px 0' }}>404</h1>
      <h2 style={{ fontSize: '24px', margin: '0 0 24px 0', fontWeight: 500 }}>Page Not Found</h2>
      <p style={{ fontSize: '16px', margin: '0 0 32px 0', color: '#6B7280' }}>The page you are looking for doesn't exist or has been moved.</p>
      <Link 
        href="/" 
        style={{ 
          padding: '12px 24px', 
          backgroundColor: '#FE8029', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '8px', 
          fontWeight: 600,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        Go back home
      </Link>
    </div>
  );
}
