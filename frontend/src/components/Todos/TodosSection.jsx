import { useState, useEffect } from 'react'
import TodosSidebar from './TodosSidebar'
import TodosMain from './TodosMain'
import { todosApi } from '../../utils/api'
import './Todos.css'

function TodosSection() {
  const [todos, setTodos] = useState([])
  const [selectedTodo, setSelectedTodo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load todos when component mounts
  useEffect(() => {
    loadTodos()
  }, [])

  const loadTodos = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await todosApi.getAll()
      if (response.success) {
        setTodos(response.data.todos || [])
      } else {
        setError('Failed to load todos')
      }
    } catch (error) {
      console.error('Error loading todos:', error)
      setError('Failed to load todos. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async (text) => {
    if (text.trim()) {
      try {
        const todoData = {
          text: text.trim(),
          completed: false
        }
        
        const response = await todosApi.create(todoData)
        if (response.success) {
          const newTodo = response.data.todo
          setTodos([newTodo, ...todos])
          setSelectedTodo(newTodo)
          return true
        } else {
          setError('Failed to create todo')
          return false
        }
      } catch (error) {
        console.error('Error creating todo:', error)
        setError('Failed to create todo. Please try again.')
        return false
      }
    }
    return false
  }

  const toggleTodo = async (id) => {
    try {
      const response = await todosApi.toggle(id)
      if (response.success) {
        const updatedTodo = response.data.todo
        setTodos(todos.map(todo => 
          todo.id === id ? updatedTodo : todo
        ))
        if (selectedTodo && selectedTodo.id === id) {
          setSelectedTodo(updatedTodo)
        }
      } else {
        setError('Failed to update todo')
      }
    } catch (error) {
      console.error('Error toggling todo:', error)
      setError('Failed to update todo. Please try again.')
    }
  }

  const deleteTodo = async (id) => {
    try {
      const response = await todosApi.delete(id)
      if (response.success) {
        setTodos(todos.filter(todo => todo.id !== id))
        if (selectedTodo && selectedTodo.id === id) {
          setSelectedTodo(null)
        }
      } else {
        setError('Failed to delete todo')
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
      setError('Failed to delete todo. Please try again.')
    }
  }

  const selectTodo = (todo) => {
    setSelectedTodo(todo)
  }

  const updateTodo = async (id, newText) => {
    try {
      const response = await todosApi.update(id, { text: newText })
      if (response.success) {
        setTodos(todos.map(todo => 
          todo.id === id ? { ...todo, text: newText } : todo
        ))
        if (selectedTodo && selectedTodo.id === id) {
          setSelectedTodo({ ...selectedTodo, text: newText })
        }
      } else {
        setError('Failed to update todo')
      }
    } catch (error) {
      console.error('Error updating todo:', error)
      setError('Failed to update todo. Please try again.')
    }
  }

  const completedCount = todos.filter(todo => todo.completed).length

  if (loading) {
    return (
      <div className="todos-section">
        <div className="loading-state">
          <p>Loading your todos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="todos-section">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      <div className="todos-layout">
        <TodosSidebar 
          todos={todos}
          selectedTodo={selectedTodo}
          onAddTodo={addTodo}
          onSelectTodo={selectTodo}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
          completedCount={completedCount}
          loading={loading}
        />
        <TodosMain 
          selectedTodo={selectedTodo}
          onUpdateTodo={updateTodo}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
        />
      </div>
    </div>
  )
}

export default TodosSection