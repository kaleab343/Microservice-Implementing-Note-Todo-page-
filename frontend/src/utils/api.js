// API utility for backend communication
const API_BASE_URL = 'http://localhost:5001/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Get auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeaders(),
      ...options
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// Notes API
export const notesApi = {
  // Get all notes for the authenticated user
  getAll: () => apiCall('/notes'),
  
  // Create a new note
  create: (noteData) => apiCall('/notes', {
    method: 'POST',
    body: JSON.stringify(noteData)
  }),
  
  // Update a note
  update: (id, noteData) => apiCall(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(noteData)
  }),
  
  // Delete a note
  delete: (id) => apiCall(`/notes/${id}`, {
    method: 'DELETE'
  }),
  
  // Search notes
  search: (query) => apiCall(`/notes/search?q=${encodeURIComponent(query)}`)
};

// Todos API
export const todosApi = {
  // Get all todos for the authenticated user
  getAll: () => apiCall('/todos'),
  
  // Create a new todo
  create: (todoData) => apiCall('/todos', {
    method: 'POST',
    body: JSON.stringify(todoData)
  }),
  
  // Update a todo
  update: (id, todoData) => apiCall(`/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(todoData)
  }),
  
  // Toggle todo completion
  toggle: (id) => apiCall(`/todos/${id}/toggle`, {
    method: 'PATCH'
  }),
  
  // Delete a todo
  delete: (id) => apiCall(`/todos/${id}`, {
    method: 'DELETE'
  })
};

// Auth API (for completeness)
export const authApi = {
  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  register: (userData) => apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  demo: () => apiCall('/auth/demo', {
    method: 'POST'
  }),
  
  getMe: () => apiCall('/auth/me')
};

export default { notesApi, todosApi, authApi };