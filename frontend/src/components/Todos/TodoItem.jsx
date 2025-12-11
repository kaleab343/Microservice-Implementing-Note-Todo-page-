function TodoItem({ todo, isSelected, onSelect, onToggle, onDelete, isSidebar = false }) {
  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete(todo.id)
  }

  const handleToggle = (e) => {
    e.stopPropagation()
    onToggle(todo.id)
  }

  const handleClick = () => {
    if (isSidebar && onSelect) {
      onSelect(todo)
    }
  }

  const itemClass = isSidebar 
    ? `todo-item-sidebar ${isSelected ? 'selected' : ''} ${todo.completed ? 'completed' : ''}`
    : `todo-item ${todo.completed ? 'completed' : ''}`

  return (
    <div className={itemClass} onClick={handleClick}>
      <div className={isSidebar ? "todo-content-sidebar" : "todo-content"}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          className="todo-checkbox"
        />
        <div className="todo-text">
          <p className={todo.completed ? 'strikethrough' : ''}>{todo.text}</p>
          <small className="todo-date">{todo.createdAt}</small>
        </div>
      </div>
      <button 
        onClick={handleDelete}
        className={isSidebar ? "delete-btn-sidebar" : "delete-btn"}
      >
        🗑️
      </button>
    </div>
  )
}

export default TodoItem