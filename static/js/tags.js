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
                const newTag = await response.json();
                this.tags.push(newTag);
                this.renderTagSelector();
                return newTag;
            }
        } catch (error) {
            console.error('Error creating tag:', error);
        }
        return null;
    }

    renderTagSelector() {
        const tagSelector = document.getElementById('tag-selector');
        if (!tagSelector) return;

        tagSelector.innerHTML = `
            <div class="flex flex-wrap gap-2 mb-4">
                ${this.tags.map(tag => `
                    <button 
                        class="tag-btn px-3 py-1 rounded-full text-sm font-medium transition-colors
                            ${this.activeTagSearch === tag.name ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}"
                        data-tag-name="${tag.name}"
                        style="border: 1px solid ${tag.color}20; color: ${tag.color}"
                    >
                        ${tag.name}
                    </button>
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
                
                // Trigger note refresh with tag search
                if (window.noteManager) {
                    window.noteManager.loadNotes();
                }
            } else if (e.target.id === 'add-tag-btn') {
                const name = prompt('Enter tag name:');
                if (name) {
                    await this.createTag(name);
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