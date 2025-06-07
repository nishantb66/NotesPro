// Tag management functionality
class TagManager {
    constructor() {
        this.tags = [];
        this.activeTagSearch = null;
        this.init();
    }

    async init() {
        await this.loadTags();
        this.renderTagSelector();
        this.setupEventListeners();
    }

    async loadTags() {
        try {
            const response = await fetch('/api/tags/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });
            if (response.ok) {
                this.tags = await response.json();
                this.renderTagSelector();
            }
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    }

    async createTag(name, color = '#3B82F6') {
        try {
            const response = await fetch('/api/tags/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, color })
            });
            if (response.ok) {
                await this.loadTags();
                return true;
            }
        } catch (error) {
            console.error('Error creating tag:', error);
        }
        return false;
    }

    async deleteTag(tagId) {
        try {
            const response = await fetch(`/api/tags/${tagId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                }
            });
            if (response.ok) {
                await this.loadTags();
                // If the deleted tag was active, clear filter
                if (this.activeTagSearch && this.tags.findIndex(t => t.id === tagId) === -1) {
                    this.activeTagSearch = null;
                }
                this.renderTagSelector();
                if (window.noteManager) window.noteManager.loadNotes();
            }
        } catch (error) {
            console.error('Error deleting tag:', error);
        }
    }

    renderTagSelector() {
        const tagSelector = document.getElementById('tag-selector');
        if (!tagSelector) return;

        tagSelector.innerHTML = `
            <div class="flex flex-wrap gap-2 mb-4 justify-center">
                ${this.tags.map(tag => `
                    <span class="relative group">
                        <button 
                            class="tag-btn px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1
                                ${this.activeTagSearch === tag.name ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}"
                            data-tag-name="${tag.name}"
                            style="border: 1px solid ${tag.color}20; color: ${tag.color}"
                        >
                            ${tag.name}
                        </button>
                        <button class="absolute -top-1 -right-1 bg-white border border-gray-300 rounded-full w-4 h-4 flex items-center justify-center text-xs text-gray-400 hover:text-red-500 hover:border-red-400 transition-opacity opacity-80 group-hover:opacity-100" style="z-index:2;" data-tag-id="${tag.id}" title="Delete tag">&times;</button>
                    </span>
                `).join('')}
                <button 
                    id="add-tag-btn"
                    class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                >
                    + Add Tag
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        const tagSelector = document.getElementById('tag-selector');
        if (!tagSelector) return;

        tagSelector.addEventListener('click', async (e) => {
            if (e.target.classList.contains('tag-btn')) {
                const tagName = e.target.dataset.tagName;
                // Toggle tag search
                if (this.activeTagSearch === tagName) {
                    this.activeTagSearch = null;
                } else {
                    this.activeTagSearch = tagName;
                }
                this.renderTagSelector();
                if (window.noteManager) window.noteManager.loadNotes();
            } else if (e.target.id === 'add-tag-btn') {
                const name = prompt('Enter tag name:');
                if (name) {
                    await this.createTag(name);
                }
            } else if (e.target.dataset.tagId) {
                // Delete tag
                if (confirm('Delete this tag?')) {
                    await this.deleteTag(Number(e.target.dataset.tagId));
                }
            }
        });
    }

    getTagSearch() {
        return this.activeTagSearch;
    }
}

// Initialize tag manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tagManager = new TagManager();
});

// Helper to reload tags after login
window.reloadTags = async () => {
    if (window.tagManager) await window.tagManager.loadTags();
}; 