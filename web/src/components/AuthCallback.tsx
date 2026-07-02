import { useEffect, useState } from 'preact/hooks';
import { handleCallback } from '../lib/auth-client';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback()
      .then(() => window.location.replace('/'))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <p>
        Login failed: {error} — <a href="/">back to home</a>
      </p>
    );
  }
  return <p>Signing you in…</p>;
}
