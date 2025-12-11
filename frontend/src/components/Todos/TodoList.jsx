import TodoItem from './TodoItem'

function TodoList({ todos, onToggleTodo, onDeleteTodo }) {
  if (todos.length === 0) {
    return (
      <div className="empty-state">
        <p>✅ No todos yet. Add your first task above!</p>
      </div>
    )
  }

  return (
    <div className="todos-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
        />
      ))}
    </div>
  )
}

export default TodoList