// static/js/app.js
const API = '/api';
let token = localStorage.getItem('access');

// show/hide helpers
function showLogin(){ document.getElementById('login-section').classList.remove('hidden'); }
function hideLogin(){ document.getElementById('login-section').classList.add('hidden'); }
function showNotes(){ document.getElementById('notes-section').classList.remove('hidden'); }
function hideNotes(){ document.getElementById('notes-section').classList.add('hidden'); }

// on load
if (token) {
  hideLogin(); showNotes(); loadNotes();
} else {
  showLogin(); hideNotes();
}

// LOGIN / SIGNUP both done by calling signup/
document.getElementById('login-btn').onclick = async () => {
  const username = document.getElementById('username').value.trim();
  if (!username) return alert('Enter a username');
  const res = await fetch(API + '/signup/', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username})
  });
  const data = await res.json();
  if (!res.ok) return alert(data.detail || 'Error');
  token = data.access;
  localStorage.setItem('access', token);
  hideLogin(); showNotes(); loadNotes();
};

// LOGOUT
document.getElementById('logout-btn').onclick = () => {
  localStorage.removeItem('access');
  location.reload();
};

// ADD a note
document.getElementById('add-note-btn').onclick = async () => {
  const content = document.getElementById('new-note-content').value.trim();
  if (!content) return;
  await fetch(API + '/notes/', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer ' + token
    },
    body: JSON.stringify({content})
  });
  document.getElementById('new-note-content').value = '';
  loadNotes();
};

// LOAD & RENDER notes
async function loadNotes(){
  const res = await fetch(API + '/notes/', {
    headers: {'Authorization':'Bearer ' + token}
  });
  const notes = await res.json();
  const list = document.getElementById('notes-list');
  list.innerHTML = '';

  notes.forEach(n => {
    const container = document.createElement('div');
    container.className = 'bg-white p-4 rounded shadow flex items-start';

    const textarea = document.createElement('textarea');
    textarea.className = 'border p-2 flex-grow';
    textarea.rows = 2;
    textarea.value = n.content;
    textarea.onchange = async () => {
      await fetch(API + `/notes/${n.id}/`, {
        method:'PUT',
        headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer ' + token
        },
        body: JSON.stringify({content: textarea.value})
      });
      loadNotes();
    };

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'ml-3 bg-red-500 text-white px-3 py-1 rounded';
    delBtn.onclick = async () => {
      await fetch(API + `/notes/${n.id}/`, {
        method:'DELETE',
        headers:{'Authorization':'Bearer '+ token}
      });
      loadNotes();
    };

    container.append(textarea, delBtn);
    list.appendChild(container);
  });
}

// Note management functionality
class NoteManager {
    constructor() {
        this.notes = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadNotes();
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const addNoteBtn = document.getElementById('add-note-btn');
        const newNoteContent = document.getElementById('new-note-content');

        loginBtn?.addEventListener('click', () => this.handleLogin());
        logoutBtn?.addEventListener('click', () => this.handleLogout());
        addNoteBtn?.addEventListener('click', () => this.handleAddNote());
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        if (!username) return;

        try {
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access', data.access);
                localStorage.setItem('refresh', data.refresh);
                this.showNotesInterface();
                await this.loadNotes();
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    }

    handleLogout() {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        this.showLoginInterface();
    }

    async loadNotes() {
        try {
            let url = '/api/notes/';
            const params = new URLSearchParams();
            
            // Add tag search if active
            const tagSearch = window.tagManager?.getTagSearch();
            if (tagSearch) {
                params.append('tag_search', tagSearch);
            }

            // Add the params to the URL if any exist
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });

            if (response.ok) {
                this.notes = await response.json();
                this.renderNotes();
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    async handleAddNote() {
        const content = document.getElementById('new-note-content').value;
        if (!content) return;

        try {
            const response = await fetch('/api/notes/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                document.getElementById('new-note-content').value = '';
                await this.loadNotes();
            }
        } catch (error) {
            console.error('Error adding note:', error);
        }
    }

    async handleDeleteNote(noteId) {
        try {
            const response = await fetch(`/api/notes/${noteId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });

            if (response.ok) {
                await this.loadNotes();
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    }

    async handleEditNote(noteId, newContent) {
        try {
            const response = await fetch(`/api/notes/${noteId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: newContent })
            });

            if (response.ok) {
                await this.loadNotes();
            }
        } catch (error) {
            console.error('Error editing note:', error);
        }
    }

    renderNotes() {
        const notesList = document.getElementById('notes-list');
        if (!notesList) return;

        if (this.notes.length === 0) {
            notesList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-slate-400 mb-4">
                        <i class="fas fa-inbox text-4xl"></i>
                    </div>
                    <p class="text-slate-500">
                        ${window.tagManager?.getTagSearch() 
                            ? 'No notes found matching the selected tag.' 
                            : 'No notes yet. Create your first note!'}
                    </p>
                </div>
            `;
            return;
        }

        notesList.innerHTML = this.notes.map(note => `
            <div class="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-6 hover:shadow-xl transition border-l-4 border-blue-500">
                <div class="flex flex-wrap gap-2 mb-3">
                    ${note.tags.map(tag => `
                        <span class="px-2 py-1 rounded-full text-xs font-medium" 
                              style="background-color: ${tag.color}20; color: ${tag.color}">
                            ${tag.name}
                        </span>
                    `).join('')}
                </div>
                <h3 class="font-semibold text-lg mb-3">${note.content.split('\n')[0]}</h3>
                <p class="text-slate-600 mb-4">${note.content}</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs text-slate-500">${new Date(note.created_at).toLocaleString()}</span>
                    <div class="flex space-x-2">
                        <button class="p-1.5 rounded-lg hover:bg-slate-100" onclick="noteManager.handleEditNote(${note.id}, prompt('Edit note:', '${note.content.replace(/'/g, "\\'")}'))">
                            <i class="fas fa-edit text-slate-600 text-sm"></i>
                        </button>
                        <button class="p-1.5 rounded-lg hover:bg-slate-100" onclick="noteManager.handleDeleteNote(${note.id})">
                            <i class="fas fa-trash text-slate-600 text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showLoginInterface() {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('notes-section').classList.add('hidden');
    }

    showNotesInterface() {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('notes-section').classList.remove('hidden');
    }
}

// Initialize note manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.noteManager = new NoteManager();
});
