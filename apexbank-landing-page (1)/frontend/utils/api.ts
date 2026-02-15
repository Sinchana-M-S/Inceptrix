const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface CustomerRegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface EmployeeRegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  employeeId: string;
  role?: 'employee' | 'manager';
  department?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    type: 'customer' | 'employee';
    accountNumber?: string;
    balance?: number;
    employeeId?: string;
    role?: string;
    department?: string;
  };
}

// Customer API calls
export const customerRegister = async (data: CustomerRegisterData): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/customer/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const customerLogin = async (data: LoginData): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/customer/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

// Employee API calls
export const employeeRegister = async (data: EmployeeRegisterData): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/employee/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const employeeLogin = async (data: LoginData): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/employee/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

// Store token in localStorage
export const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

// Get token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Remove token from localStorage
export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Store current user type (customer | employee) so we can show employee-only UI
export const setUserType = (userType: 'customer' | 'employee') => {
  localStorage.setItem('userType', userType);
};

export const getUserType = (): 'customer' | 'employee' | null => {
  return localStorage.getItem('userType') as 'customer' | 'employee' | null;
};

export const removeUserType = () => {
  localStorage.removeItem('userType');
};

// Store current user display name for header
export const setUserName = (firstName: string, lastName: string) => {
  localStorage.setItem('userName', `${firstName} ${lastName}`);
};

export const getUserName = (): string | null => {
  return localStorage.getItem('userName');
};

export const removeUserName = () => {
  localStorage.removeItem('userName');
};

// Full logout (token + user type + name)
export const logout = () => {
  removeAuthToken();
  removeUserType();
  removeUserName();
};

// Resend verification email
export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return response.json();
};

// Verify email with token
export const verifyEmail = async (token: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/auth/verify-email/${token}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};

// Get Google OAuth URL
export const getGoogleAuthUrl = (): string => {
  return `${API_URL.replace('/api', '')}/api/auth/google`;
};

// Email-based login (Magic Link)
export const emailLogin = async (email: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/auth/email-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return response.json();
};

// Verify magic link token
export const verifyMagicLink = async (token: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/verify-magic-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  return response.json();
};
