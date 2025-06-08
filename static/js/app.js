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
  hideLogin(); showNotes();
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
  hideLogin(); showNotes();
};

// LOGOUT
document.getElementById('logout-btn').onclick = () => {
  localStorage.removeItem('access');
  location.reload();
};

// Note management functionality
class NoteManager {
    constructor() {
        this.notes = [];
        this.favoritesView = false;
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
        const searchBar = document.getElementById('note-search-bar');
        const showFavBtn = document.getElementById('show-fav-btn');
        const showAllBtn = document.getElementById('show-all-btn');

        loginBtn?.addEventListener('click', () => this.handleLogin());
        logoutBtn?.addEventListener('click', () => this.handleLogout());
        addNoteBtn?.addEventListener('click', () => this.handleAddNote());

        // Debounced search
        let searchTimeout = null;
        searchBar?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.loadNotes();
            }, 250);
        });

        if (showFavBtn) showFavBtn.addEventListener('click', () => this.loadNotes(true));
        if (showAllBtn) showAllBtn.addEventListener('click', () => this.loadNotes(false));
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
                if (window.reloadTags) await window.reloadTags();
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

    async loadNotes(favoritesOnly = false) {
        this.favoritesView = favoritesOnly;
        try {
            let url = '/api/notes/';
            const params = new URLSearchParams();
            
            // Add tag search if active
            const tagSearch = window.tagManager?.getTagSearch();
            if (tagSearch) {
                params.append('tag_search', tagSearch);
            }

            // Add search param from search bar
            const searchBar = document.getElementById('note-search-bar');
            const searchValue = searchBar ? searchBar.value.trim() : '';
            if (searchValue) {
                params.append('search', searchValue);
            }

            if (favoritesOnly) {
                params.append('favorite', 'true');
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

        // Show/hide the Show All Notes button
        const showAllBtn = document.getElementById('show-all-btn');
        if (showAllBtn) showAllBtn.classList.toggle('hidden', !favoritesOnly);
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

    async toggleFavorite(noteId, isFav) {
        try {
            const response = await fetch(`/api/notes/${noteId}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_favorite: !isFav })
            });
            if (response.ok) {
                await this.loadNotes(this.favoritesView);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
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

        notesList.innerHTML = this.notes.map(note => {
            // Extract the first line as a title if available
            const lines = note.content.split('\n');
            const title = lines[0].trim();
            const body = lines.slice(1).join('\n').trim();
            return `
            <div class="note-card">
                <div class="flex flex-wrap gap-2 mb-2 justify-center">
                    ${note.tags.map(tag => `
                        <span class="note-tag" style="color: ${tag.color}">${tag.name}</span>
                    `).join('')}
                </div>
                <div class="flex flex-col gap-1 items-center w-full">
                    <h3 class="note-title">${title || 'Untitled Note'}</h3>
                    ${body ? `<p class="note-body">${body}</p>` : ''}
                </div>
                <div class="flex justify-between items-center w-full mt-2 pt-2 note-meta">
                    <span class="text-xs text-slate-400">${new Date(note.created_at).toLocaleString()}</span>
                    <div class="flex space-x-2 note-actions">
                        <button class="note-action-btn" title="${note.is_favorite ? 'Unfavorite' : 'Favorite'}" onclick="noteManager.toggleFavorite(${note.id}, ${note.is_favorite})">
                            <i class="fa${note.is_favorite ? 's' : 'r'} fa-star" style="color:${note.is_favorite ? '#facc15' : '#cbd5e1'}"></i>
                        </button>
                        <button class="note-action-btn edit" title="Edit" onclick="noteManager.handleEditNote(${note.id}, prompt('Edit note:', '${note.content.replace(/'/g, "\\'")}'))">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="note-action-btn delete" title="Delete" onclick="noteManager.handleDeleteNote(${note.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
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
