"use client";

// lib/logout.js
export async function logoutUser() {
  try {
    // Call the API to clear the cookie
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Clear localStorage
    localStorage.removeItem('user');
    
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}
