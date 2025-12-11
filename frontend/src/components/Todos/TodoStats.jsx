function TodoStats({ completedCount, totalCount }) {
  const progressPercentage = totalCount ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="todo-stats">
      <p>Progress: {completedCount}/{totalCount} completed</p>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  )
}

export default TodoStats