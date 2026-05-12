import { useSignIn } from '@clerk/clerk-react';

export default function LoginScreen() {
  const { signIn, isLoaded } = useSignIn();

  const handleGoogleSignIn = () => {
    signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/',
    });
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32,
    }}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48, justifyContent: 'center' }}>
          <div style={{ width: 8, height: 8, background: '#c8f04a', borderRadius: '50%' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 15 }}>myfinance</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 40 }}>
          Sign in to access your finances
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={!isLoaded}
          style={{
            width: '100%', background: '#fff', color: '#0a0a0a',
            border: 'none', padding: '14px', borderRadius: 10,
            fontSize: 14, fontWeight: 500, cursor: isLoaded ? 'pointer' : 'default',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10, opacity: isLoaded ? 1 : 0.5,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
