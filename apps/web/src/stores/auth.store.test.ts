import { useAuthStore } from './auth.store';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.activeTab).toBe('chats');
  });

  it('should set authenticated user and tokens', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'u-1',
        email: 'tariq@acme.com',
        name: 'Muhammad Tariq',
        role: 'OWNER',
      },
      'jwt-token-123',
      'refresh-token-123',
    );

    const state = useAuthStore.getState();
    expect(state.user?.email).toBe('tariq@acme.com');
    expect(state.token).toBe('jwt-token-123');
    expect(state.refreshToken).toBe('refresh-token-123');
  });

  it('should switch active tab correctly', () => {
    useAuthStore.getState().setActiveTab('tasks');
    expect(useAuthStore.getState().activeTab).toBe('tasks');

    useAuthStore.getState().setActiveTab('reports');
    expect(useAuthStore.getState().activeTab).toBe('reports');
  });

  it('should clear state on logout', () => {
    useAuthStore.getState().setAuth(
      { id: 'u-1', email: 'alice@acme.com', name: 'Alice', role: 'ADMIN' },
      'tok',
      'ref',
    );

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
