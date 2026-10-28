const API_BASE = 'http://localhost:4000/api';

class ApiClient {
  private getHeaders(): Record<string, string> {
    let token = '';
    let subdomain = 'acme';

    if (typeof window !== 'undefined') {
      const authState = localStorage.getItem('auth_storage');
      if (authState) {
        try {
          const parsed = JSON.parse(authState);
          token = parsed.state?.token || '';
          subdomain = parsed.state?.tenant?.subdomain || parsed.state?.currentSubdomain || 'acme';
        } catch {}
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant': subdomain,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}${url}${query}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  }

  async post<T>(url: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  }

  async put<T>(url: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  }

  async patch<T>(url: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  }

  async delete<T>(url: string, params?: Record<string, any>): Promise<T> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}${url}${query}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  }

  async uploadFile(file: File): Promise<{ file_url: string; key: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = this.getHeaders();
    delete headers['Content-Type']; // Let browser set multipart boundary

    const res = await fetch(`${API_BASE}/storage/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      throw new Error('File upload failed');
    }

    return res.json();
  }
}

export const api = new ApiClient();
