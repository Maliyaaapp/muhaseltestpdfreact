import React, { useState, useEffect } from 'react';
import { 
  setAuthToken, 
  createUser, 
  getUser, 
  updateUser, 
  deleteUser 
} from './userApiClient';

/**
 * Example React component for user management
 * This demonstrates how to use the API client to interact with the backend
 * instead of directly using Supabase client
 */
const UserManagementComponent = ({ authToken }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    name: '',
    role: 'user'
  });
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Set auth token when component mounts or token changes
  useEffect(() => {
    if (authToken) {
      setAuthToken(authToken);
    }
  }, [authToken]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle user creation
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newUser = await createUser(formData);
      setUsers(prev => [...prev, newUser.user]);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        username: '',
        name: '',
        role: 'user'
      });
      
      alert('User created successfully!');
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // Handle user update
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Remove password if empty (not updating password)
      const updateData = {...formData};
      if (!updateData.password) {
        delete updateData.password;
      }
      
      const updatedUser = await updateUser(selectedUserId, updateData);
      
      setUsers(prev => 
        prev.map(user => user.id === selectedUserId ? updatedUser.user : user)
      );
      
      alert('User updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    setLoading(true);
    setError(null);

    try {
      await deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setFormData({
          email: '',
          password: '',
          username: '',
          name: '',
          role: 'user'
        });
      }
      
      alert('User deleted successfully!');
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Load user data for editing
  const handleEditUser = async (userId) => {
    setSelectedUserId(userId);
    setLoading(true);
    setError(null);

    try {
      const userData = await getUser(userId);
      setFormData({
        email: userData.user.email || '',
        password: '', // Don't populate password field for security
        username: userData.user.username || '',
        name: userData.user.name || '',
        role: userData.user.role || 'user'
      });
    } catch (err) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-management">
      <h2>{selectedUserId ? 'Edit User' : 'Create New User'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={selectedUserId ? handleUpdateUser : handleCreateUser}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">
            {selectedUserId ? 'Password (leave empty to keep current):' : 'Password:'}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required={!selectedUserId}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="name">Full Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="role">Role:</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            required
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : selectedUserId ? 'Update User' : 'Create User'}
          </button>
          
          {selectedUserId && (
            <button 
              type="button" 
              onClick={() => {
                setSelectedUserId(null);
                setFormData({
                  email: '',
                  password: '',
                  username: '',
                  name: '',
                  role: 'user'
                });
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2>User List</h2>
      <div className="user-list">
        {users.length === 0 ? (
          <p>No users found. Create a new user to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>
                    <button onClick={() => handleEditUser(user.id)}>Edit</button>
                    <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManagementComponent;