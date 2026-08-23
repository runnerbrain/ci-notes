'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Sign out failed:', error);
      setLoading(false);
    }
  };

  return (
    <button
      className={`signout-btn ${loading ? 'loading' : ''}`}
      onClick={handleSignOut}
      disabled={loading}
    >
      {loading ? (
        <span className="spinner-small"></span>
      ) : (
        'Sign out'
      )}
    </button>
  );
}
