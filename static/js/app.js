// static/js/app.js
const API = '/api';
let token = localStorage.getItem('access');

// show/hide helpers
function showLogin() { document.getElementById('login-section').classList.remove('hidden'); }
function hideLogin() { document.getElementById('login-section').classList.add('hidden'); }
function showNotes() { document.getElementById('notes-section').classList.remove('hidden'); }
function hideNotes() { document.getElementById('notes-section').classList.add('hidden'); }

// on load
if (token) {
    hideLogin(); showNotes();
} else {
    showLogin(); hideNotes();
}

// LOGIN / SIGNUP
document.getElementById('login-btn').onclick = async () => {
    const username = document.getElementById('username').value.trim();
    if (!username) return alert('Enter a username');

    const res = await fetch(API + '/signup/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.detail || 'Error');

    // 1. Save token
    localStorage.setItem('access', data.access);

    // 2. Show the notes view
    hideLogin();
    showNotes();

    // 3. Tell NoteManager to load & display the profile
    if (window.noteManager) {
        await window.noteManager.loadProfile();
        window.noteManager.showWelcome();
    }

    // 4. Reload tags & notes
    window.reloadTags && await window.reloadTags();
    await window.noteManager.loadNotes();
    await window.noteManager.loadSharedWithMe();
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
        this.profile = null;           // ← new: holds loaded profile
        this.init();
    }

    async init() {
        this.setupEventListeners();
        if (localStorage.getItem('access')) {
            await this.loadProfile();  // ← new: fetch profile on init
            this.showWelcome();        // ← new: display welcome text
        }
        await this.loadNotes();
        await this.loadSharedWithMe();
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const addNoteBtn = document.getElementById('add-note-btn');
        const newNoteContent = document.getElementById('new-note-content');
        const searchBar = document.getElementById('note-search-bar');
        const showFavBtn = document.getElementById('show-fav-btn');
        const showAllBtn = document.getElementById('show-all-btn');
        const shareBtn = document.getElementById('share-btn');
        const profileBtn = document.getElementById('profile-btn');        // ← new
        const profileCancel = document.getElementById('profile-cancel-btn');// ← new
        const profileForm = document.getElementById('profile-form');      // ← new

        loginBtn?.addEventListener('click', () => this.handleLogin());
        logoutBtn?.addEventListener('click', () => this.handleLogout());
        addNoteBtn?.addEventListener('click', () => this.handleAddNote());
        shareBtn?.addEventListener('click', () => this.handleShare());

        // Debounced search
        let searchTimeout = null;
        searchBar?.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.loadNotes(), 250);
        });

        if (showFavBtn) showFavBtn.addEventListener('click', () => this.loadNotes(true));
        if (showAllBtn) showAllBtn.addEventListener('click', () => this.loadNotes(false));

        // ← new profile listeners
        if (profileBtn) profileBtn.addEventListener('click', () => this.showProfile());
        if (profileCancel) profileCancel.addEventListener('click', () => this.showNotesInterface());
        if (profileForm) profileForm.addEventListener('submit', e => { e.preventDefault(); this.saveProfile(); });
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
                await this.loadProfile();    // ← new: load profile after login
                this.showWelcome();          // ← new: update welcome text
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

    async loadProfile() {
        try {
            const res = await fetch('/api/profile/', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
            });
            if (res.ok) this.profile = await res.json();
        } catch (err) {
            console.error('Error loading profile:', err);
        }
    }

    showWelcome() {
        const el = document.getElementById('welcome-text');
        if (!el || !this.profile) return;
        const name = this.profile.full_name || this.profile.username;
        el.textContent = `Welcome, ${name}`;
    }

    showProfile() {
        document.getElementById('notes-section').classList.add('hidden');
        document.getElementById('profile-section').classList.remove('hidden');
        // populate form
        document.getElementById('profile-full-name').value = this.profile.full_name || '';
        document.getElementById('profile-email').value = this.profile.email || '';
        document.getElementById('profile-interests').value = this.profile.interests || '';
    }

    async saveProfile() {
        const fullName = document.getElementById('profile-full-name').value.trim();
        const email = document.getElementById('profile-email').value.trim();
        const interests = document.getElementById('profile-interests').value.trim();

        try {
            const res = await fetch('/api/profile/', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ full_name: fullName, email, interests })
            });

            if (res.ok) {
                this.profile = await res.json();
                this.showWelcome();
                alert('Profile updated successfully!');
                this.showNotesInterface();
            } else {
                const err = await res.json();
                alert('Error saving profile: ' + JSON.stringify(err));
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Error saving profile.');
        }
    }

    async loadNotes(favoritesOnly = false) {
        this.favoritesView = favoritesOnly;
        try {
            let url = '/api/notes/';
            const params = new URLSearchParams();

            const tagSearch = window.tagManager?.getTagSearch();
            if (tagSearch) params.append('tag_search', tagSearch);

            const searchValue = document.getElementById('note-search-bar')?.value.trim() || '';
            if (searchValue) params.append('search', searchValue);

            if (favoritesOnly) params.append('favorite', 'true');
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
            });

            if (response.ok) {
                this.notes = await response.json();
                this.renderNotes();
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }

        document.getElementById('show-all-btn')
            .classList.toggle('hidden', !favoritesOnly);
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
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
            });
            if (response.ok) await this.loadNotes();
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
            if (response.ok) await this.loadNotes();
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
            if (response.ok) await this.loadNotes(this.favoritesView);
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
                    <p class="text-slate-500">${window.tagManager?.getTagSearch()
                    ? 'No notes found matching the selected tag.'
                    : 'No notes yet. Create your first note!'
                }</p>
                </div>`;
            return;
        }

        notesList.innerHTML = this.notes.map(note => {
            const lines = note.content.split('\n');
            const title = lines[0].trim();
            const body = lines.slice(1).join('\n').trim();
            return `
            <div class="note-card">
              <div class="flex flex-wrap gap-2 mb-2 justify-center">
                ${note.tags.map(tag => `<span class="note-tag" style="color:${tag.color}">${tag.name}</span>`).join('')}
              </div>
              <div class="flex flex-col gap-1 items-center w-full">
                <h3 class="note-title">${title || 'Untitled Note'}</h3>
                ${body ? `<p class="note-body">${body}</p>` : ''}
              </div>
              <div class="flex justify-between items-center w-full mt-2 pt-2 note-meta">
                <span class="text-xs text-slate-400">${new Date(note.created_at).toLocaleString()}</span>
                <div class="flex space-x-2 note-actions">
                  <button class="note-action-btn" title="${note.is_favorite ? 'Unfavorite' : 'Favorite'}"
                          onclick="noteManager.toggleFavorite(${note.id}, ${note.is_favorite})">
                    <i class="fa${note.is_favorite ? 's' : 'r'} fa-star"
                       style="color:${note.is_favorite ? '#facc15' : '#cbd5e1'}"></i>
                  </button>
                  <button class="note-action-btn edit" title="Edit"
                          onclick="noteManager.handleEditNote(${note.id}, prompt('Edit note:', '${note.content.replace(/'/g, "\\'")}'))">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="note-action-btn delete" title="Delete"
                          onclick="noteManager.handleDeleteNote(${note.id})">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>`;
        }).join('');
    }

    showLoginInterface() {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('notes-section').classList.add('hidden');
        document.getElementById('profile-section').classList.add('hidden'); // ← new
    }

    showNotesInterface() {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('notes-section').classList.remove('hidden');
        document.getElementById('profile-section').classList.add('hidden'); // ← new
    }

    async handleShare() {
        try {
            const response = await fetch('/api/notes/', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
            });
            if (response.ok) {
                const notes = await response.json();
                this.showShareModal(notes);
            }
        } catch (error) {
            console.error('Error loading notes for sharing:', error);
        }
    }

    renderSharedWithMe(shares) {
        const section = document.getElementById('shared-with-me-section');
        if (!section) return;
        if (!shares || shares.length === 0) {
            section.innerHTML = `
                <div class="glass-card rounded-3xl shadow-xl p-8 border border-white/20 w-full flex flex-col items-center">
                    <h2 class="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">Notes Shared With You</h2>
                    <div class="text-slate-400 mb-4">
                        <i class="fas fa-inbox text-4xl"></i>
                    </div>
                    <p class="text-slate-500">No notes have been shared with you yet.</p>
                </div>
            `;
            return;
        }
        section.innerHTML = `
            <div class="glass-card rounded-3xl shadow-xl p-8 border border-white/20 w-full">
                <h2 class="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-8">Notes Shared With You</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${shares.map(share => `
                        <div class="note-card glass-morphism rounded-2xl p-6 border border-white/20 hover-lift">
                            <div class="flex items-center gap-3 mb-2">
                                <i class="fas fa-user text-blue-500"></i>
                                <span class="font-semibold text-slate-700">${share.sender.username}</span>
                                <span class="text-xs text-slate-400 ml-2">shared on ${new Date(share.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="note-title mb-2">${share.note.content.substring(0, 60)}${share.note.content.length > 60 ? '...' : ''}</div>
                            <div class="note-body">${share.note.content}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

// Initialize note manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.noteManager = new NoteManager();
});

// --- Share Modal Logic ---
function createShareModal() {
    if (document.getElementById('share-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        <button id="close-share-modal" class="absolute top-3 right-3 text-slate-400 hover:text-red-500 text-2xl">&times;</button>
        <h2 class="text-2xl font-bold text-blue-700 mb-2">Share a Note</h2>
        <div class="flex flex-col gap-3">
          <label class="font-semibold text-slate-700">Recipient Username</label>
          <input id="share-username" type="text" class="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Enter username..." />
        </div>
        <div class="flex flex-col gap-3">
          <label class="font-semibold text-slate-700">Select Note</label>
          <select id="share-note-select" class="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"></select>
        </div>
        <button id="send-share-btn" class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 rounded-lg mt-2 hover:from-blue-700 hover:to-indigo-700 transition">Send</button>
        <div id="share-error" class="text-red-500 text-sm mt-2 hidden"></div>
        <hr class="my-2" />
        <div>
          <h3 class="text-lg font-semibold text-slate-700 mb-2">Notes Shared With You</h3>
          <div id="received-shares-list" class="flex flex-col gap-3 max-h-48 overflow-y-auto"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-share-modal').onclick = () => modal.remove();
    document.getElementById('send-share-btn').onclick = sendShareNote;
    loadShareModalNotes();
    loadReceivedShares();
}

function loadShareModalNotes() {
    const select = document.getElementById('share-note-select');
    select.innerHTML = '';
    if (!window.noteManager?.notes?.length) {
        select.innerHTML = '<option disabled>No notes available</option>';
        return;
    }
    window.noteManager.notes.forEach(note => {
        const title = note.content.split('\n')[0] || 'Untitled Note';
        select.innerHTML += `<option value="${note.id}">${title}</option>`;
    });
}

async function sendShareNote() {
    const username = document.getElementById('share-username').value.trim();
    const noteId = document.getElementById('share-note-select').value;
    const errorDiv = document.getElementById('share-error');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    if (!username || !noteId) {
        errorDiv.textContent = 'Please enter a username and select a note.';
        errorDiv.classList.remove('hidden');
        return;
    }
    try {
        const res = await fetch('/api/shares/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiver: username, note_ids: [parseInt(noteId)] })
        });
        if (!res.ok) {
            const data = await res.json();
            errorDiv.textContent = data.detail || data.receiver || data.non_field_errors || 'Failed to share note.';
            errorDiv.classList.remove('hidden');
        } else {
            errorDiv.textContent = 'Note shared successfully!';
            errorDiv.classList.remove('hidden');
            errorDiv.classList.remove('text-red-500');
            errorDiv.classList.add('text-green-600');
            setTimeout(() => errorDiv.classList.add('hidden'), 2000);
            document.getElementById('share-username').value = '';
        }
    } catch (e) {
        errorDiv.textContent = 'Failed to share note.';
        errorDiv.classList.remove('hidden');
    }
    loadReceivedShares();
}

async function loadReceivedShares() {
    const list = document.getElementById('received-shares-list');
    if (!list) return;
    list.innerHTML = '<div class="text-slate-400 text-center">Loading...</div>';
    try {
        const response = await fetch('/api/shares/received/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        });
        if (response.ok) {
            const shares = await response.json();
            // Render each share with note content, not [object Object]
            list.innerHTML = shares.map(share => `
                <div class="note-card glass-morphism rounded-2xl p-4 border border-white/20 mb-2">
                    <div class="font-semibold text-slate-700">From: ${share.sender.username}</div>
                    <div class="text-xs text-slate-400 mb-1">Shared at: ${new Date(share.created_at).toLocaleString()}</div>
                    <div class="note-title mb-1">${share.note.content ? share.note.content.substring(0, 60) : ''}${share.note.content && share.note.content.length > 60 ? '...' : ''}</div>
                    <div class="note-body">${share.note.content || ''}</div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<div class="text-red-500 text-center">Failed to load shared notes.</div>';
        }
    } catch (error) {
        list.innerHTML = '<div class="text-red-500 text-center">Failed to load shared notes.</div>';
    }
}

// Add Share button to header
function addShareButton() {
    if (document.getElementById('share-btn')) return;
    const header = document.querySelector('.header-section .flex.gap-3');
    if (!header) return;
    const btn = document.createElement('button');
    btn.id = 'share-btn';
    btn.className = 'bg-green-100 hover:bg-green-200 text-green-700 font-semibold px-5 py-2 rounded-xl shadow transition flex items-center gap-2';
    btn.innerHTML = '<i class="fas fa-share"></i> Share';
    btn.onclick = createShareModal;
    header.prepend(btn);
}

document.addEventListener('DOMContentLoaded', () => {
    addShareButton();
});
