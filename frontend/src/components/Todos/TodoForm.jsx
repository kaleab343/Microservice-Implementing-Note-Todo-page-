import { useState } from 'react'

function TodoForm({ onAddTodo }) {
  const [todoText, setTodoText] = useState('')

  const handleSubmit = () => {
    if (onAddTodo(todoText)) {
      setTodoText('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="input-section">
      <input
        type="text"
        value={todoText}
        onChange={(e) => setTodoText(e.target.value)}
        placeholder="Add a new todo..."
        className="todo-input"
        onKeyPress={handleKeyPress}
      />
      <button onClick={handleSubmit} className="add-btn">
        Add Todo
      </button>
    </div>
  )
}

export default TodoForm