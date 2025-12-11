function NotesMain({ selectedNote, onUpdateNote, onDeleteNote }) {
  const handleTextChange = (e) => {
    if (selectedNote) {
      onUpdateNote(selectedNote.id, e.target.value)
    }
  }

  const handleDelete = () => {
    if (selectedNote) {
      onDeleteNote(selectedNote.id)
    }
  }

  if (!selectedNote) {
    return (
      <div className="notes-main">
        <div className="note-placeholder">
          <div className="placeholder-content">
            <h3>Nothing here yet...</h3>
            <p>Click a note on the left to start editing</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="notes-main">
      <div className="note-detail">
        <div className="note-detail-header">
          <h2>{selectedNote.title}</h2>
          <div className="note-actions">
            <span className="note-date-detail">{selectedNote.createdAt}</span>
            <button 
              onClick={handleDelete}
              className="delete-btn-main"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
        <div className="note-content-main">
          <textarea
            value={selectedNote.text}
            onChange={handleTextChange}
            className="note-editor"
            placeholder="Start writing your note..."
          />
        </div>
      </div>
    </div>
  )
}

export default NotesMain