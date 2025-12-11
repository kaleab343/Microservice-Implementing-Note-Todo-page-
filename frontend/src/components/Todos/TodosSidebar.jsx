import { useState } from 'react'
import TodoItem from './TodoItem'
import TodoStats from './TodoStats'

function TodosSidebar({ todos, selectedTodo, onAddTodo, onSelectTodo, onToggleTodo, onDeleteTodo, completedCount }) {
  const [todoText, setTodoText] = useState('')

  const handleAddTodo = () => {
    if (onAddTodo(todoText)) {
      setTodoText('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTodo()
    }
  }

  return (
    <div className="todos-sidebar">
      <div className="input-section-vertical">
        <input
          type="text"
          value={todoText}
          onChange={(e) => setTodoText(e.target.value)}
          placeholder="Add a new todo..."
          className="todo-input-sidebar"
          onKeyPress={handleKeyPress}
        />
        <button onClick={handleAddTodo} className="add-btn">
          Add Todo
        </button>
      </div>

      {todos.length > 0 && (
        <TodoStats 
          completedCount={completedCount}
          totalCount={todos.length}
        />
      )}

      <div className="todos-list">
        {todos.length === 0 ? (
          <div className="empty-state-sidebar">
            <p>✅ No todos yet!</p>
          </div>
        ) : (
          todos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              isSelected={selectedTodo?.id === todo.id}
              onSelect={onSelectTodo}
              onToggle={onToggleTodo}
              onDelete={onDeleteTodo}
              isSidebar={true}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default TodosSidebar