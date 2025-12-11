import { useState } from 'react'
import './Auth.css'

function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = () => {
    if (isSignUp) {
      if (!formData.name.trim() || !formData.email.trim() || !formData.username.trim() || !formData.password.trim()) {
        setError('Please fill in all fields')
        return false
      }
      if (!formData.email.includes('@')) {
        setError('Please enter a valid email address')
        return false
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return false
      }
    } else {
      if (!formData.username.trim() || !formData.password.trim()) {
        setError('Please fill in both fields')
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login'
      const requestBody = isSignUp 
        ? { name: formData.name, email: formData.email, username: formData.username, password: formData.password }
        : { username: formData.username, password: formData.password }

      console.log('🚀 Making request to:', `http://localhost:5001${endpoint}`)
      console.log('📝 Request body:', requestBody)

      const response = await fetch(`http://localhost:5001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📡 Response status:', response.status)
      
      const data = await response.json()
      console.log('📊 Response data:', data)

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        
        console.log('✅ Success! User logged in:', data.data.user)
        // Call onLogin with user data
        onLogin(data.data.user)
      } else {
        console.log('❌ Auth failed:', data.message)
        setError(data.message || 'Authentication failed')
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      console.log('🚀 Making demo login request to: http://localhost:5001/api/auth/demo')
      
      const response = await fetch('http://localhost:5001/api/auth/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      console.log('📡 Demo response status:', response.status)
      
      const data = await response.json()
      console.log('📊 Demo response data:', data)

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        
        console.log('✅ Demo login success! User:', data.data.user)
        // Call onLogin with user data
        onLogin(data.data.user)
      } else {
        console.log('❌ Demo login failed:', data.message)
        setError(data.message || 'Demo login failed')
      }
    } catch (error) {
      console.error('❌ Demo login network error:', error)
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setFormData({
      name: '',
      email: '',
      username: '',
      password: ''
    })
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="floating-notes">
          <div className="note-float note1">📝</div>
          <div className="note-float note2">✅</div>
          <div className="note-float note3">📋</div>
          <div className="note-float note4">💭</div>
          <div className="note-float note5">📌</div>
        </div>
      </div>
      
      <div className={`auth-layout ${isSignUp ? 'show-signup' : ''}`}>
        {/* Main Login Card */}
        <div className="login-container">
          <div className="login-header">
            <div className="app-icon">📝</div>
            <h1>Welcome back!</h1>
            <p>Sign in to continue to MicroNote</p>
          </div>

          <form onSubmit={isSignUp ? () => {} : handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {error && !isSignUp && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading || isSignUp}
            >
              {isLoading && !isSignUp ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="auth-toggle">
              <p>
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={toggleMode}
                  className="toggle-btn"
                  disabled={isLoading}
                >
                  Sign Up
                </button>
              </p>
            </div>

            <div className="demo-section">
              <p>Just want to try it out?</p>
              <button 
                type="button" 
                onClick={handleDemoLogin}
                className="demo-btn"
              >
                🚀 Try Demo
              </button>
            </div>
          </form>
        </div>

        {/* Sign Up Side Panel */}
        <div className="signup-panel">
          <div className="signup-header">
            <div className="app-icon">✨</div>
            <h1>Create Account</h1>
            <p>Join MicroNote to organize your thoughts</p>
          </div>

          <form onSubmit={isSignUp ? handleSubmit : () => {}} className="signup-form">
            <div className="form-group">
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-email">Email Address</label>
              <input
                id="signup-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Choose a username"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Create a password (min 6 characters)"
                disabled={isLoading}
              />
            </div>

            {error && isSignUp && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="signup-btn"
              disabled={isLoading || !isSignUp}
            >
              {isLoading && isSignUp ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="auth-toggle">
              <p>
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={toggleMode}
                  className="toggle-btn"
                  disabled={isLoading}
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login