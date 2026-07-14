import { useEffect, useState } from 'preact/hooks';
import { getUser, initiateLogin, logout } from '../lib/auth-client';

export default function AuthButton() {
  // Auth state lives in localStorage, absent during SSR. Rendering on the
  // server emits 'Log in', and Preact hydration mismatches against the
  // logged-in client render, leaving both buttons (by-2oi). Render nothing
  // until mounted so the DOM comes purely from client-side auth state.
  const [user, setUser] = useState<ReturnType<typeof getUser> | undefined>(undefined);
  useEffect(() => setUser(getUser()), []);

  if (user === undefined) return null;
  if (user) {
    return (
      <span>
        {user.username} <button onClick={logout}>Log out</button>
      </span>
    );
  }
  return <button onClick={() => void initiateLogin()}>Log in</button>;
}
