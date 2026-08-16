import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import LoginScreen from './components/LoginScreen';
import {renderGoogleButton, sendLoginToSheet, useAuth} from './lib/googleAuth';
import './index.css';

function AuthGate() {
  const {user, signIn, signOut} = useAuth();

  if (!user) {
    const handleCredential = (credential: string) => {
      try {
        const loggedIn = signIn(credential);
        if (loggedIn) sendLoginToSheet(loggedIn);
      } catch (error) {
        alert((error as Error).message);
      }
    };

    return (
      <LoginScreen
        renderButton={(container) =>
          renderGoogleButton(container, handleCredential).catch(() => {
            /* error surfaced inside LoginScreen */
          })
        }
      />
    );
  }

  return <App user={user} onSignOut={signOut} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
