import { useAuthStore } from './auth.store';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.currentSubdomain).toBe('acme');
    expect(state.activeTab).toBe('chats');
  });

  it('should set authenticated user and tenant info', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'u-1',
        email: 'tariq@acme.com',
        name: 'Muhammad Tariq',
        role: 'OWNER',
      },
      {
        id: 't-1',
        name: 'TechPak Enterprises',
        subdomain: 'acme',
      },
      'jwt-token-123',
      'refresh-token-123',
    );

    const state = useAuthStore.getState();
    expect(state.user?.email).toBe('tariq@acme.com');
    expect(state.tenant?.subdomain).toBe('acme');
    expect(state.token).toBe('jwt-token-123');
    expect(state.isSuperAdmin).toBe(false);
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
      { id: 't-1', name: 'Acme', subdomain: 'acme' },
      'tok',
      'ref',
    );

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });
});
