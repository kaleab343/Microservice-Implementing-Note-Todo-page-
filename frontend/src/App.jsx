import { useState, useEffect } from 'react'
import NotesSection from './components/Notes/NotesSection'
import TodosSection from './components/Todos/TodosSection'
import Login from './components/Auth/Login'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('notes')
  const [notesCount, setNotesCount] = useState(0)
  const [todosCount, setTodosCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Check for existing login on app start
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing saved user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    setUser(null)
    setActiveTab('notes')
    setNotesCount(0)
    setTodosCount(0)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading MicroNote...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>📝 MicroNote</h1>
          <span>quick notes & stuff</span>
        </div>
        
        <div className="topbar-right">
          <div className="tabs">
            <button 
              className={activeTab === 'notes' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('notes')}
            >
              Notes {notesCount > 0 && `(${notesCount})`}
            </button>
            <button 
              className={activeTab === 'todos' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('todos')}
            >
              Todos {todosCount > 0 && `(${todosCount})`}
            </button>
          </div>
          
          <div className="user-menu">
            <span className="username">Hey, {user.name}!</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="content">
        {activeTab === 'notes' && <NotesSection />}
        {activeTab === 'todos' && <TodosSection />}
      </div>
    </div>
  )
}

export default App
