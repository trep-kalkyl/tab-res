/**
 * Manages the comment modal dialog for adding and displaying comments.
 */
export default class CommentModalManager {
    /**
     * Initializes the modal manager and binds DOM elements.
     * @param {string} modalId - The ID of the modal element.
     */
    constructor(modalId = 'commentModal') {
        this.modal = document.getElementById(modalId);
        this.input = document.getElementById('commentInput');
        this.timestamp = document.getElementById('commentTimestamp');
        this.title = document.getElementById('modalCommentTitle');
        this.currentRow = null;
        this.commentType = null; // 'item', 'row', or 'category'
        this.tables = {};
        this.init();
    }

    /**
     * Registers a Tabulator table instance by name.
     * @param {string} name
     * @param {Tabulator} tableInstance
     */
    registerTable(name, tableInstance) {
        this.tables[name] = tableInstance;
    }

    /**
     * Creates or returns the comments container element in the modal.
     * @returns {HTMLElement}
     */
    createCommentsContainer() {
        let commentsContainer = document.getElementById('commentsContainer');
        if (!commentsContainer) {
            commentsContainer = document.createElement('div');
            commentsContainer.id = 'commentsContainer';
            commentsContainer.style.maxHeight = '200px';
            commentsContainer.style.overflowY = 'auto';
            commentsContainer.style.marginBottom = '16px';
            commentsContainer.style.border = '1px solid #eee';
            commentsContainer.style.borderRadius = '4px';
            commentsContainer.style.padding = '10px';
            const modalBody = document.querySelector('.tab-modal-body');
            modalBody.insertBefore(commentsContainer, this.input);
        }
        return commentsContainer;
    }

    /**
     * Shows the comment modal for a given row and item.
     * @param {Tabulator.RowComponent} row
     * @param {string} itemName
     * @param {string} type - 'item', 'row', or 'category'
     */
    show(row, itemName, type = 'item') {
        this.currentRow = row;
        this.commentType = type;
        const fieldName = this.getCommentFieldName(type);
        const comments = row.getData()[fieldName] || [];
        this.title.textContent = `Comments for ${itemName}`;
        const commentsContainer = this.createCommentsContainer();
        commentsContainer.innerHTML = '';
        if (comments.length > 0) {
            const sortedComments = [...comments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            sortedComments.forEach(comment => this.addCommentToList(comment, commentsContainer));
            this.timestamp.textContent = `${comments.length} comment${comments.length !== 1 ? 's' : ''}`;
        } else {
            this.timestamp.textContent = 'No comments yet';
            commentsContainer.innerHTML = '<p style="color: #888; font-style: italic; text-align: center;">No comments yet</p>';
        }
        this.input.value = '';
        this.input.disabled = false;
        this.input.placeholder = 'Write a new comment...';
        document.getElementById('saveComment').textContent = 'Add comment';
        document.getElementById('cancelComment').textContent = 'Close';
        this.modal.style.display = 'block';
        setTimeout(() => this.modal.classList.add('active'), 50);
        this.input.focus();
    }

    /**
     * Hides the comment modal and resets state.
     */
    hide() {
        this.modal.classList.remove('active');
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.currentRow = null;
            this.commentType = null;
        }, 300);
    }

    /**
     * Adds a comment to the comment list in the modal.
     * @param {object} comment
     * @param {HTMLElement} container
     */
    addCommentToList(comment, container) {
        const commentElement = document.createElement('div');
        commentElement.style.borderBottom = '1px solid #eee';
        commentElement.style.padding = '8px 0';
        commentElement.style.marginBottom = '8px';
        const commentText = document.createElement('div');
        commentText.textContent = comment.text;
        commentText.style.marginBottom = '4px';
        const commentTime = document.createElement('div');
        commentTime.textContent = comment.timestamp;
        commentTime.style.fontSize = '12px';
        commentTime.style.color = '#777';
        commentElement.appendChild(commentText);
        commentElement.appendChild(commentTime);
        container.appendChild(commentElement);
    }

    /**
     * Returns the correct field name for the comment type.
     * @param {string} type
     * @returns {string}
     */
    getCommentFieldName(type) {
        const fieldMap = {
            'item': 'item_comments',
            'row': 'row_comments',
            'category': 'category_comments'
        };
        return fieldMap[type] || 'item_comments';
    }

    /**
     * Returns the associated table name for the comment type.
     * @param {string} type
     * @returns {string}
     */
    getAssociatedTableName(type) {
        const tableMap = {
            'item': 'dataTable',
            'row': 'dataTable',
            'category': 'menuTable'
        };
        return tableMap[type] || 'dataTable';
    }

    /**
     * Saves a new comment to the current row and updates the modal.
     */
    saveComment() {
        if (this.currentRow && this.input.value.trim()) {
            // Create timestamp and comment object
            const now = new Date();
            const options = { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            };
            const newTimestamp = now.toLocaleString('sv-SE', options).replace(',', '');
            const newComment = {
                text: this.input.value.trim(),
                timestamp: newTimestamp
            };

            // Get the correct field name for the comment list
            const fieldName = this.getCommentFieldName(this.commentType);

            // Get the row's data and add the new comment
            const rowData = this.currentRow.getData();
            if (!rowData[fieldName]) rowData[fieldName] = [];
            rowData[fieldName].push(newComment);

            // Update the row in Tabulator
            this.currentRow.update({ ...rowData });

            // Force formatter to re-run on the row (for sub-tables)
            if (typeof this.currentRow.reformat === "function") {
                this.currentRow.reformat();
            } else if (typeof this.currentRow.normalizeHeight === "function") {
                this.currentRow.normalizeHeight();
            }

            // Add the comment to the modal
            const commentsContainer = document.getElementById('commentsContainer');
            this.addCommentToList(newComment, commentsContainer);

            // Update the comment counter
            this.timestamp.textContent = `${rowData[fieldName].length} comment${rowData[fieldName].length !== 1 ? 's' : ''}`;

            // Clear input and scroll to bottom
            this.input.value = '';
            this.input.focus();
            commentsContainer.scrollTop = commentsContainer.scrollHeight;
        }
    }

    /**
     * Handles cancel action (close modal).
     */
    handleCancel() {
        this.hide();
    }

    /**
     * Initializes modal event listeners for buttons, keyboard, and modal background.
     */
    init() {
        // Save button click
        document.getElementById('saveComment').addEventListener('click', () => this.saveComment());
        // Cancel button click
        document.getElementById('cancelComment').addEventListener('click', () => this.handleCancel());
        // Click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') this.hide();
        });
        // Ctrl+Enter or Cmd+Enter saves comment
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.saveComment();
            }
        });
    }
}
