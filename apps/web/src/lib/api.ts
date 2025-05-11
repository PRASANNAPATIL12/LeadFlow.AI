const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Generic fetch wrapper with error handling
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Get the auth token from local storage
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  // Add auth headers if token exists
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

// Lead API functions
export async function getLeads(filters = {}) {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  const endpoint = `/api/leads${queryString ? `?${queryString}` : ''}`;
  
  return fetchWithAuth(endpoint);
}

export async function getLeadById(id: string) {
  return fetchWithAuth(`/api/leads/${id}`);
}

export async function getLeadStats() {
  // Placeholder for now, as this endpoint is not fully defined in the API routes
  // return fetchWithAuth('/api/leads/stats');
  console.warn('getLeadStats is a placeholder and needs a corresponding API endpoint.');
  return Promise.resolve({ totalLeads: 0, qualifiedLeads: 0, conversionRate: 0, averageScore: 0 });
}

export async function createLead(leadData) {
  return fetchWithAuth('/api/leads', {
    method: 'POST',
    body: JSON.stringify(leadData),
  });
}

export async function updateLead(id: string, leadData) {
  return fetchWithAuth(`/api/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(leadData),
  });
}

export async function deleteLead(id: string) {
  return fetchWithAuth(`/api/leads/${id}`, {
    method: 'DELETE',
  });
}

// AI Agent API functions
export async function triggerLeadScoring(leadId: string) {
  return fetchWithAuth(`/api/leads/${leadId}/score', { // Adjusted to match lead.routes.ts
    method: 'POST',
  });
}

export async function generateEmailForLead(leadId: string, templateId?: string) {
  // This endpoint is not defined in the current API routes. Adding a placeholder.
  console.warn('generateEmailForLead is a placeholder and needs a corresponding API endpoint.');
  // return fetchWithAuth(`/api/ai/generate-email/${leadId}`, {
  //   method: 'POST',
  //   body: JSON.stringify({ templateId }),
  // });
  return Promise.resolve({ subject: 'Generated Email Subject', body: 'Generated email body...' });
}

export async function getAgentActions(leadId: string) {
  // This endpoint is not defined in the current API routes. Adding a placeholder.
  console.warn('getAgentActions is a placeholder and needs a corresponding API endpoint.');
  // return fetchWithAuth(`/api/ai/actions?leadId=${leadId}`);
  return Promise.resolve([]);
}

// Authentication functions
export async function login(email: string, password: string) {
  const response = await fetchWithAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    // headers are set by fetchWithAuth
  });
  
  if (response.token && typeof window !== 'undefined') {
    localStorage.setItem('auth_token', response.token);
  }
  
  return response;
}

export async function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
  // Assuming logout is a POST, though not explicitly defined in auth.routes.ts
  // return fetchWithAuth('/api/auth/logout', { method: 'POST' });
  console.warn('logout is a placeholder and needs a corresponding API endpoint for server-side session invalidation.');
  return Promise.resolve({ message: 'Logged out' });
}

export async function getCurrentUser() {
  // This endpoint is not defined in the current API routes. Adding a placeholder.
  console.warn('getCurrentUser is a placeholder and needs a corresponding API endpoint.');
  // return fetchWithAuth('/api/auth/me');
  return Promise.resolve(null); 
}
