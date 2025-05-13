// Kommentarformatterare för Tabulator

export default class CommentFormatter {
    static format(cell, type = 'item') {
        let comments = cell.getValue ? cell.getValue() || [] : cell || [];
        const count = comments.length;
        const element = document.createElement('div');
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'space-between';
        element.style.cursor = 'pointer';
        const textSpan = document.createElement('span');
        
        if (count > 0) {
            const sortedComments = [...comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const latestComment = sortedComments[0];
            textSpan.textContent = latestComment.text.length > 30 
                ? latestComment.text.substring(0, 30) + "..." 
                : latestComment.text;
        } else {
            textSpan.textContent = "Lägg till kommentar...";
            textSpan.style.fontStyle = 'italic';
            textSpan.style.color = '#888';
        }
        
        element.appendChild(textSpan);
        
        if (count > 0) {
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

    static createCommentColumn(type, itemNameField) {
        const fieldName = {
            'item': 'item_comments',
            'row': 'row_comments',
            'category': 'category_comments'
        }[type];

        return {
            title: "Kommentarer",
            field: fieldName,
            width: 250,
            formatter: (cell) => CommentFormatter.format(cell, type),
            cellClick: function(e, cell) {
                const rowData = cell.getRow().getData();
                const displayName = rowData[itemNameField] || rowData['item_name'] || 'Item';
                
                // Assuming commentManager is globally available
                if (window.commentManager) {
                    window.commentManager.show(cell.getRow(), displayName, type);
                } else {
                    console.error('CommentManager not found');
                }
            }
        };
    }
}
