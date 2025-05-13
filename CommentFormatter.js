// Comment formatter for Tabulator
// Provides formatting and column definition for comment fields in Tabulator tables

export default class CommentFormatter {
    /**
     * Formats a cell to display the latest comment and a badge with the comment count.
     * @param {object} cell - The Tabulator cell component or an array of comments.
     * @param {string} type - The type of comment (e.g., 'item', 'row', 'category').
     * @returns {HTMLElement} - The formatted cell element.
     */
    static format(cell, type = 'item') {
        // Get comments from the cell value or directly from the input
        let comments = cell.getValue ? cell.getValue() || [] : cell || [];
        const count = comments.length;

        // Create the main container element for the cell
        const element = document.createElement('div');
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'space-between';
        element.style.cursor = 'pointer';

        // Create the text span for displaying the latest comment or placeholder
        const textSpan = document.createElement('span');
        
        if (count > 0) {
            // Sort comments by timestamp (latest first)
            const sortedComments = [...comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const latestComment = sortedComments[0];

            // Show the first 30 characters of the latest comment, add ellipsis if longer
            textSpan.textContent = latestComment.text.length > 30 
                ? latestComment.text.substring(0, 30) + "..." 
                : latestComment.text;
        } else {
            // If no comments, show placeholder text
            textSpan.textContent = "Add a comment...";
            textSpan.style.fontStyle = 'italic';
            textSpan.style.color = '#888';
        }
        
        element.appendChild(textSpan);
        
        if (count > 0) {
            // Create a badge to show the number of comments
            const badge = document.createElement('span');
            badge.textContent = count;
            badge.style.backgroundColor = '#4a90e2';
            badge.style.color = 'white';
            badge.style.borderRadius = '12px';
            badge.style.padding = '2px 8px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.style.marginLeft = '10px';
            element.appendChild(badge);
        }
        
        return element;
    }

    /**
     * Creates a Tabulator column definition for a comment field.
     * @param {string} type - The type of comment field ('item', 'row', 'category').
     * @param {string} itemNameField - The field name to use for display in the comment dialog.
     * @returns {object} - Tabulator column definition object.
     */
    static createCommentColumn(type, itemNameField) {
        // Map the comment type to the corresponding field name
        const fieldName = {
            'item': 'item_comments',
            'row': 'row_comments',
            'category': 'category_comments'
        }[type];

        return {
            title: "Comments",
            field: fieldName,
            width: 250,
            formatter: (cell) => CommentFormatter.format(cell, type),
            cellClick: function(e, cell) {
                // Get the row data and determine the display name
                const rowData = cell.getRow().getData();
                const displayName = rowData[itemNameField] || rowData['item_name'] || 'Item';
                
                // Show the comment dialog using the global commentManager (if available)
                if (window.commentManager) {
                    window.commentManager.show(cell.getRow(), displayName, type);
                } else {
                    console.error('CommentManager not found');
                }
            }
        };
    }
}
