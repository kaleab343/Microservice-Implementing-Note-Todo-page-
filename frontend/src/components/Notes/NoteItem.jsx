function NoteItem({ note, isSelected, onSelect, onDelete }) {
  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete(note.id)
  }

  return (
    <div 
      className={`note-item-sidebar ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(note)}
    >
      <div className="note-content-sidebar">
        <h4 className="note-title">{note.title}</h4>
        <p className="note-preview">
          {note.text.substring(0, 50)}{note.text.length > 50 ? '...' : ''}
        </p>
        <small className="note-date">{note.createdAt}</small>
      </div>
      <button 
        onClick={handleDelete}
        className="delete-btn-sidebar"
      >
        🗑️
      </button>
    </div>
  )
}

export default NoteItem