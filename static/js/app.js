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
