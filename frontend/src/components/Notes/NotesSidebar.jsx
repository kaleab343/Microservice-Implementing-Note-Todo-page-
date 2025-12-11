import { useState } from 'react'
import NoteItem from './NoteItem'

function NotesSidebar({ notes, selectedNote, onAddNote, onSelectNote, onDeleteNote }) {
  const [noteText, setNoteText] = useState('')
  const [noteTitle, setNoteTitle] = useState('')

  const handleAddNote = () => {
    if (onAddNote(noteTitle, noteText)) {
      setNoteText('')
      setNoteTitle('')
    }
  }

  return (
    <div className="notes-sidebar">
      <div className="input-section-vertical">
        <input
          type="text"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          placeholder="Note title (optional)"
          className="note-title-input"
        />
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Write your note here..."
          rows={3}
          className="note-input-sidebar"
        />
        <button onClick={handleAddNote} className="add-btn">
          Add Note
        </button>
      </div>

      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="empty-state-sidebar">
            <p>📝 No notes yet!</p>
          </div>
        ) : (
          notes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              isSelected={selectedNote?.id === note.id}
              onSelect={onSelectNote}
              onDelete={onDeleteNote}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default NotesSidebar