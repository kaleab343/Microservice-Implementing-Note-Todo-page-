function TodosMain({ selectedTodo, onUpdateTodo, onToggleTodo, onDeleteTodo }) {
  const handleTextChange = (e) => {
    if (selectedTodo) {
      onUpdateTodo(selectedTodo.id, e.target.value)
    }
  }

  const handleToggle = () => {
    if (selectedTodo) {
      onToggleTodo(selectedTodo.id)
    }
  }

  const handleDelete = () => {
    if (selectedTodo) {
      onDeleteTodo(selectedTodo.id)
    }
  }

  if (!selectedTodo) {
    return (
      <div className="todos-main">
        <div className="todo-placeholder">
          <div className="placeholder-content">
            <h3>Pick a todo</h3>
            <p>Select something from the list to work on it</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="todos-main">
      <div className="todo-detail">
        <div className="todo-detail-header">
          <div className="todo-title-section">
            <input
              type="checkbox"
              checked={selectedTodo.completed}
              onChange={handleToggle}
              className="todo-checkbox-main"
            />
            <h2 className={selectedTodo.completed ? 'completed-title' : ''}>
              {selectedTodo.completed ? 'Completed Task' : 'Task Details'}
            </h2>
          </div>
          <div className="todo-actions">
            <span className="todo-date-detail">{selectedTodo.createdAt}</span>
            <button 
              onClick={handleDelete}
              className="delete-btn-main"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
        <div className="todo-content-main">
          <textarea
            value={selectedTodo.text}
            onChange={handleTextChange}
            className="todo-editor"
            placeholder="Edit your todo here..."
            style={{ 
              textDecoration: selectedTodo.completed ? 'line-through' : 'none',
              color: selectedTodo.completed ? '#888' : '#333'
            }}
          />
          <div className="todo-status">
            <span className={`status-badge ${selectedTodo.completed ? 'completed' : 'pending'}`}>
              {selectedTodo.completed ? '✅ Completed' : '⏳ Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TodosMain