import { useState } from 'preact/hooks';
import { getUser, initiateLogin, logout } from '../lib/auth-client';

export default function AuthButton() {
  const [user] = useState(getUser);

  if (user) {
    return (
      <span>
        {user.username} <button onClick={logout}>Log out</button>
      </span>
    );
  }
  return <button onClick={() => void initiateLogin()}>Log in</button>;
}
