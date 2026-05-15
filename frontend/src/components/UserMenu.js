import React, { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

export default function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1.5px solid #2a2a2a', padding: 0,
          cursor: 'pointer', overflow: 'hidden',
          background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {user.imageUrl ? (
          <img src={user.imageUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 14, color: '#f0ede8', fontFamily: "'DM Sans', sans-serif" }}>
            {(user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0] || '?').toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0,
          background: '#111', border: '0.5px solid #2a2a2a',
          borderRadius: 12, padding: '12px 0', minWidth: 220,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{ padding: '8px 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {user.imageUrl && (
                <img src={user.imageUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#f0ede8' }}>
                  {user.fullName || user.firstName || '—'}
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>
                  {user.emailAddresses?.[0]?.emailAddress || ''}
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: '0.5px', background: '#1e1e1e', margin: '0 0 8px' }} />

          <button
            onClick={() => signOut()}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px', background: 'none', border: 'none',
              fontSize: 13, color: '#888', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = '#f0ede8'}
            onMouseLeave={e => e.target.style.color = '#888'}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
