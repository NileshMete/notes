document.addEventListener('DOMContentLoaded', function() {
    const notesContainer = document.getElementById('notes-container');
    const newNoteInput = document.getElementById('new-note');
    const addBtn = document.getElementById('add-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const emptyState = document.getElementById('empty-state');
    const themeSwitch = document.getElementById('theme-switch');

    console.log('themeSwitch element:', themeSwitch);

    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeSwitch) themeSwitch.checked = true;
    }

    // Theme switcher
    if (themeSwitch) {
        themeSwitch.addEventListener('change', function() {
            console.log('Theme switch toggled. Checked:', this.checked);
            if (this.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    } else {
        console.warn('themeSwitch element not found.');
    }

    // Load notes from localStorage
    loadNotes();

    // Add note event
    addBtn.addEventListener('click', addNote);
    newNoteInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addNote();
    });

    function addNote() {
        const noteText = newNoteInput.value.trim();
        if (noteText) {
            createNoteElement(noteText, false);
            newNoteInput.value = '';
            saveNotes();
            newNoteInput.focus();
        }
    }

    function createNoteElement(text, isDone, id = Date.now()) {
        if (emptyState) emptyState.style.display = 'none';

        const note = document.createElement('div');
        note.className = `note ${isDone ? 'done' : 'not-done'}`;
        note.dataset.id = id;

        note.innerHTML = `
            <div class="drag-handle">☰</div>
            <div class="note-content">${text}</div>
            <div class="note-actions">
                <button class="status-btn ripple">${isDone ? 'Done' : 'Not Done'}</button>
                <button class="delete-btn ripple">Delete</button>
            </div>
        `;

        // Add event listeners to buttons
        const statusBtn = note.querySelector('.status-btn');
        const deleteBtn = note.querySelector('.delete-btn');

        statusBtn.addEventListener('click', function() {
            note.classList.toggle('done');
            note.classList.toggle('not-done');
            statusBtn.textContent = note.classList.contains('done') ? 'Done' : 'Not Done';
            saveNotes();
        });

        deleteBtn.addEventListener('click', function() {
            note.style.transform = 'scale(0.9)';
            note.style.opacity = '0';
            setTimeout(() => {
                note.remove();
                if (notesContainer.children.length === 1) {
                    emptyState.style.display = 'block';
                }
                saveNotes();
            }, 300);
        });

        // Make note draggable
        setupDragAndDrop(note);

        notesContainer.appendChild(note);
        return note;
    }

    function setupDragAndDrop(note) {
        note.draggable = true;

        // For desktop
        note.addEventListener('dragstart', function(e) {
            this.classList.add('dragging');
            e.dataTransfer.setData('text/plain', this.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        note.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });

        // For touch devices
        let touchStartY = 0;
        let touchStartX = 0;
        let isDragging = false;

        note.addEventListener('touchstart', function(e) {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            isDragging = false;
        }, { passive: true });

        note.addEventListener('touchmove', function(e) {
            if (!isDragging) {
                // Check if it's a deliberate drag (not a scroll)
                const yDiff = Math.abs(e.touches[0].clientY - touchStartY);
                const xDiff = Math.abs(e.touches[0].clientX - touchStartX);

                if (yDiff > 10 && yDiff > xDiff) {
                    isDragging = true;
                    this.classList.add('dragging');
                }
            }

            if (isDragging) {
                e.preventDefault();
                const touchY = e.touches[0].clientY;
                const afterElement = getDragAfterElement(notesContainer, touchY);

                if (afterElement) {
                    notesContainer.insertBefore(this, afterElement);
                } else {
                    notesContainer.appendChild(this);
                }
            }
        }, { passive: false });

        note.addEventListener('touchend', function() {
            if (isDragging) {
                this.classList.remove('dragging');
                saveNotes();
            }
        });
    }

    // Container events for drag and drop
    notesContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        const draggingNote = document.querySelector('.note.dragging');
        if (!draggingNote) return;

        const afterElement = getDragAfterElement(notesContainer, e.clientY);
        if (afterElement) {
            notesContainer.insertBefore(draggingNote, afterElement);
        } else {
            notesContainer.appendChild(draggingNote);
        }
    });

    notesContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        saveNotes();
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.note:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function saveNotes() {
        const notes = [];
        document.querySelectorAll('.note').forEach(note => {
            notes.push({
                id: note.dataset.id,
                text: note.querySelector('.note-content').textContent,
                isDone: note.classList.contains('done')
            });
        });
        localStorage.setItem('notes', JSON.stringify(notes));
    }

    function loadNotes() {
        const savedNotes = localStorage.getItem('notes');
        if (savedNotes) {
            const notes = JSON.parse(savedNotes);
            if (notes.length > 0) {
                emptyState.style.display = 'none';
                notes.forEach(note => {
                    createNoteElement(note.text, note.isDone, note.id);
                });
            }
        }
    }

    // Export notes as JSON file
    exportBtn.addEventListener('click', function() {
        const notes = JSON.parse(localStorage.getItem('notes')) || [];
        if (notes.length === 0) {
            alert("No notes to export!");
            return;
        }
        const data = JSON.stringify(notes, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'notes-backup.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import notes from JSON file
    importBtn.addEventListener('click', function() {
        importFile.click();
    });
    //hello nilesh here
    importFile.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedNotes = JSON.parse(e.target.result);
                if (!Array.isArray(importedNotes)) {
                    throw new Error("Invalid format");
                }
                localStorage.setItem('notes', JSON.stringify(importedNotes));
                location.reload();
            } catch (error) {
                alert("Error importing notes. Please check the file format.");
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });
});
