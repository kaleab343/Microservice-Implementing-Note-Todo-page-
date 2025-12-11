import { useState, useEffect } from 'react'
import NotesSidebar from './NotesSidebar'
import NotesMain from './NotesMain'
import { notesApi } from '../../utils/api'
import './Notes.css'

function NotesSection() {
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load notes when component mounts
  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await notesApi.getAll()
      if (response.success) {
        setNotes(response.data.notes || [])
      } else {
        setError('Failed to load notes')
      }
    } catch (error) {
      console.error('Error loading notes:', error)
      setError('Failed to load notes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addNote = async (title, text) => {
    if (text.trim()) {
      try {
        const noteData = {
          title: title.trim() || `Note ${notes.length + 1}`,
          text: text.trim()
        }
        
        const response = await notesApi.create(noteData)
        if (response.success) {
          const newNote = response.data.note
          setNotes([newNote, ...notes])
          setSelectedNote(newNote)
          return true
        } else {
          setError('Failed to create note')
          return false
        }
      } catch (error) {
        console.error('Error creating note:', error)
        setError('Failed to create note. Please try again.')
        return false
      }
    }
    return false
  }

  const deleteNote = async (id) => {
    try {
      const response = await notesApi.delete(id)
      if (response.success) {
        setNotes(notes.filter(note => note.id !== id))
        if (selectedNote && selectedNote.id === id) {
          setSelectedNote(null)
        }
      } else {
        setError('Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      setError('Failed to delete note. Please try again.')
    }
  }

  const selectNote = (note) => {
    setSelectedNote(note)
  }

  const updateNote = async (id, newText) => {
    try {
      const response = await notesApi.update(id, { text: newText })
      if (response.success) {
        setNotes(notes.map(note => 
          note.id === id ? { ...note, text: newText } : note
        ))
        if (selectedNote && selectedNote.id === id) {
          setSelectedNote({ ...selectedNote, text: newText })
        }
      } else {
        setError('Failed to update note')
      }
    } catch (error) {
      console.error('Error updating note:', error)
      setError('Failed to update note. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="notes-section">
        <div className="loading-state">
          <p>Loading your notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="notes-section">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      <div className="notes-layout">
        <NotesSidebar 
          notes={notes}
          selectedNote={selectedNote}
          onAddNote={addNote}
          onSelectNote={selectNote}
          onDeleteNote={deleteNote}
          loading={loading}
        />
        <NotesMain 
          selectedNote={selectedNote}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
        />
      </div>
    </div>
  )
}

export default NotesSection