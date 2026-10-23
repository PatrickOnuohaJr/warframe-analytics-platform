import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The mocked Supabase client: tests set `mockState` to describe who is signed
// in and what the owner-row query returns.
const mockState = { session: null, ownerResult: { data: null, error: null } };
const signOut = vi.fn();
const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: mockState.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: (...a) => signOut(...a),
      signInWithOAuth: (...a) => signInWithOAuth(...a),
    },
  },
  wfUser: {
    from: () => ({ select: () => ({ maybeSingle: () => Promise.resolve(mockState.ownerResult) }) }),
  },
}));

import AuthGate from '../../src/components/AuthGate';

const signedIn = { user: { id: 'user-1' } };

function renderGate() {
  return render(<AuthGate><p>the app</p></AuthGate>);
}

describe('AuthGate', () => {
  beforeEach(() => {
    signOut.mockClear();
    signInWithOAuth.mockClear();
    mockState.session = null;
    mockState.ownerResult = { data: null, error: null };
  });

  it('shows the login screen, never the app, when signed out', async () => {
    renderGate();
    expect(await screen.findByText('Sign in with Google')).toBeTruthy();
    expect(screen.queryByText('the app')).toBeNull();
  });

  it('starts the Google flow with a redirect back to this origin', async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(await screen.findByText('Sign in with Google'));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  });

  it('lets the owner through to the app', async () => {
    mockState.session = signedIn;
    mockState.ownerResult = { data: { user_id: 'user-1' }, error: null };
    renderGate();
    expect(await screen.findByText('the app')).toBeTruthy();
  });

  it('blocks a signed-in account that is not an owner, and offers sign out', async () => {
    const user = userEvent.setup();
    mockState.session = signedIn;
    mockState.ownerResult = { data: null, error: null };
    renderGate();
    expect(await screen.findByText('Not authorized')).toBeTruthy();
    expect(screen.queryByText('the app')).toBeNull();
    await user.click(screen.getByText('Sign out'));
    expect(signOut).toHaveBeenCalled();
  });

  it('lets users through before the lockdown exists (owner table missing)', async () => {
    mockState.session = signedIn;
    mockState.ownerResult = { data: null, error: { code: 'PGRST205' } };
    renderGate();
    expect(await screen.findByText('the app')).toBeTruthy();
  });

  it('fails closed with a retry when access cannot be verified', async () => {
    mockState.session = signedIn;
    mockState.ownerResult = { data: null, error: { code: 'PGRST301', message: 'JWT expired' } };
    renderGate();
    await waitFor(() => expect(screen.getByText('Retry')).toBeTruthy());
    expect(screen.queryByText('the app')).toBeNull();
  });
});
