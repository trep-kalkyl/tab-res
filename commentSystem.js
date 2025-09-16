// ====================================
// Tabulator Comments Module - Export Version
// Clean text storage with HTML rendering in overlay only
// ====================================

// Import för AJAX-hantering
import * as ajaxHandler from "./ajaxHandler.js";

// CommentSanitizer med säker länkhantering
class CommentSanitizer {
    // Lista över tillåtna HTML-taggar och attribut
    static allowedTags = ['a', 'br', 'strong', 'em', 'b', 'i'];
    static allowedAttributes = {
        'a': ['href', 'title', 'target']
    };
    
    // Säkra URL-protokoll
    static safeProtocols = ['http:', 'https:', 'mailto:'];
    
    // Grundläggande escape-funktion för osäkra tecken
    static escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;");
    }
    
    // Validera URL för säkerhet
    static isValidUrl(url) {
        try {
            // Om URL:en inte har protokoll, lägg till https://
            let testUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
                testUrl = 'https://' + url;
            }
            
            const urlObj = new URL(testUrl);
            return this.safeProtocols.includes(urlObj.protocol.toLowerCase());
        } catch {
            return false;
        }
    }
    
    // Sanitera HTML medan tillåtna taggar behålls
    static sanitizeHtml(html) {
        if (!html || typeof html !== 'string') return '';
        
        // Skapa en temporär div för parsing
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Rekursiv funktion för att rensa noder
        const cleanNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // Kontrollera om taggen är tillåten
                if (!this.allowedTags.includes(tagName)) {
                    // Returnera bara textinnehållet för otillåtna taggar
                    return node.textContent;
                }
                
                // Skapa ny säker element
                const newElement = document.createElement(tagName);
                
                // Hantera tillåtna attribut
                if (this.allowedAttributes[tagName]) {
                    for (const attr of this.allowedAttributes[tagName]) {
                        const attrValue = node.getAttribute(attr);
                        if (attrValue) {
                            if (attr === 'href') {
                                // Special validering för href
                                if (this.isValidUrl(attrValue)) {
                                    newElement.setAttribute(attr, attrValue);
                                    // Lägg till säkerhetsattribut för externa länkar
                                    if (attrValue.startsWith('http')) {
                                        newElement.setAttribute('rel', 'noopener noreferrer');
                                        newElement.setAttribute('target', '_blank');
                                    }
                                }
                            } else if (attr === 'target') {
                                // Tillåt endast säkra target-värden
                                if (['_blank', '_self'].includes(attrValue)) {
                                    newElement.setAttribute(attr, attrValue);
                                }
                            } else {
                                // Escape andra attribut
                                newElement.setAttribute(attr, this.escapeHtml(attrValue));
                            }
                        }
                    }
                }
                
                // Rekursivt rensa barn-noder
                for (const child of node.childNodes) {
                    const cleanedChild = cleanNode(child);
                    if (typeof cleanedChild === 'string') {
                        newElement.appendChild(document.createTextNode(cleanedChild));
                    } else if (cleanedChild instanceof Node) {
                        newElement.appendChild(cleanedChild);
                    }
                }
                
                return newElement;
            }
            
            return '';
        };
        
        // Rensa alla noder och bygg resultat
        let result = '';
        for (const child of temp.childNodes) {
            const cleaned = cleanNode(child);
            if (typeof cleaned === 'string') {
                result += cleaned;
            } else if (cleaned instanceof Node) {
                const tempContainer = document.createElement('div');
                tempContainer.appendChild(cleaned);
                result += tempContainer.innerHTML;
            }
        }
        
        return result;
    }
    
    // Auto-länka URL:er i text - ENDAST FÖR VISNING
    static autoLinkUrls(text) {
        if (!text || typeof text !== 'string') return text;
        
        console.log('🔍 autoLinkUrls input:', text);
        
        // Använd en unik markör för att undvika dubbel-länkning
        const LINK_MARKER = '___ALREADY_LINKED___';
        let result = text;
        
        // 1. Skydda redan existerande länkar från att länkas igen
        result = result.replace(/<a\s[^>]*href[^>]*>.*?<\/a>/gi, (match) => {
            console.log('🔒 Skyddar befintlig länk:', match);
            return LINK_MARKER + match + LINK_MARKER;
        });
        
        // 2. Hantera e-postadresser FÖRST och MEST SPECIFIKT
        result = result.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, (match, email) => {
            console.log('📧 Hittade e-post:', email);
            const mailtoUrl = `mailto:${email}`;
            if (this.isValidUrl(mailtoUrl)) {
                const linkedEmail = `<a href="${this.escapeHtml(mailtoUrl)}">${this.escapeHtml(email)}</a>`;
                console.log('📧 Länkad e-post:', linkedEmail);
                return linkedEmail;
            }
            return match;
        });
        
        // 3. Hantera markdown bold (**text**) - konvertera till HTML
        result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        console.log('📝 Efter markdown-konvertering:', result);
        
        // 4. Hantera fullständiga URL:er med protokoll
        result = result.replace(/(^|\s|>)(https?:\/\/[^\s<>"']+)(\s|<|$|\.)/gi, (match, prefix, url, suffix) => {
            console.log('🌐 Hittade URL:', url);
            if (this.isValidUrl(url)) {
                const linkedUrl = `${prefix}<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(url)}</a>${suffix}`;
                console.log('🌐 Länkad URL:', linkedUrl);
                return linkedUrl;
            }
            return match;
        });
        
        // 5. Hantera www.domain.com (kontrollera att det inte redan är länkat från e-post-steget)
        result = result.replace(/(^|\s|>)(www\.[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/gi, (match, prefix, domain) => {
            console.log('🌍 Kollar www-domän:', domain);
            
            // Kolla om denna domän redan är del av en länkad e-postadress
            const beforeMatch = result.substring(0, result.indexOf(match));
            if (beforeMatch.includes(`">${domain}</a>`) || beforeMatch.includes(`mailto:${domain}`)) {
                console.log('🌍 Skippar - redan länkad som e-post');
                return match;
            }
            
            const fullUrl = `https://${domain}`;
            if (this.isValidUrl(fullUrl)) {
                const linkedDomain = `${prefix}<a href="${this.escapeHtml(fullUrl)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(domain)}</a>`;
                console.log('🌍 Länkad www-domän:', linkedDomain);
                return linkedDomain;
            }
            return match;
        });
        
        // 6. Hantera enkla domäner (sista och mest försiktig)
        result = result.replace(/(^|\s|>)([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/gi, (match, prefix, domain) => {
            console.log('🏠 Kollar enkel domän:', domain);
            
            // Kolla om denna domän redan är del av en länkad e-postadress eller URL
            const beforeMatch = result.substring(0, result.indexOf(match));
            if (beforeMatch.includes(`">${domain}</a>`) || beforeMatch.includes(`mailto:`) || beforeMatch.includes(domain)) {
                console.log('🏠 Skippar - redan processad');
                return match;
            }
            
            // Skippa vanliga ord som innehåller punkter men inte är domäner
            if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
                return match;
            }
            
            const parts = domain.split('.');
            if (parts.length >= 2 && parts[0].length > 1 && parts[parts.length - 1].length >= 2) {
                const fullUrl = `https://${domain}`;
                if (this.isValidUrl(fullUrl)) {
                    const linkedDomain = `${prefix}<a href="${this.escapeHtml(fullUrl)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(domain)}</a>`;
                    console.log('🏠 Länkad enkel domän:', linkedDomain);
                    return linkedDomain;
                }
            }
            return match;
        });
        
        // 7. Återställ skyddade länkar
        result = result.replace(new RegExp(LINK_MARKER, 'g'), '');
        
        console.log('✅ autoLinkUrls slutresultat:', result);
        return result;
    }
    
    // Huvudsakliga sanitize-funktionen - ENDAST TEXT-RENSNING
    static sanitize(text, options = {}) {
        if (!text || typeof text !== 'string') return '';
        
        const {
            maxLength = 1000
        } = options;
        
        // Begränsa längd och rensa farlig text - INGEN auto-linking här
        let sanitized = text.slice(0, maxLength);
        
        // Ta bort skadliga protokoll och event handlers från rå text
        sanitized = sanitized
            .replace(/javascript:/gi, "")
            .replace(/data:/gi, "")
            .replace(/vbscript:/gi, "")
            .replace(/on\w+=/gi, "");
        
        return sanitized.trim();
    }
    
    // Sanitera kommentarsobjekt - ENDAST TEXT
    static sanitizeComment(comment, options = {}) {
        if (!comment || typeof comment !== 'object') return null;
        
        const sanitizedText = this.sanitize(comment.text, options);
        
        return {
            text: sanitizedText,
            timestamp: this.escapeHtml(comment.timestamp || '')
        };
    }
    
    // Sanitera array av kommentarer - ENDAST TEXT
    static sanitizeComments(comments, options = {}) {
        if (!Array.isArray(comments)) return [];
        
        return comments
            .map(comment => this.sanitizeComment(comment, options))
            .filter(comment => comment && comment.text);
    }
}

// CommentValidator - endast text-validering
class CommentValidator {
    static validate(text, options = {}) {
        const errors = [];
        
        if (!text || typeof text !== 'string') {
            errors.push('Comment text is required');
        } else {
            // Sanitera ENDAST text (ingen HTML-processning)
            const sanitized = CommentSanitizer.sanitize(text);
            
            if (sanitized.length === 0) {
                errors.push('Comment cannot be empty');
            }
            if (sanitized.length > 1000) {
                errors.push('Comment too long (max 1000 characters)');
            }
            if (sanitized.length < 2) {
                errors.push('Comment too short (min 2 characters)');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            text: text ? CommentSanitizer.sanitize(text.trim()) : ''
        };
    }
}

// Timestamp utility with collision prevention
class TimestampManager {
    static lastTimestamp = null;
    static counter = 0;
    
    static generate() {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        };
        let timestamp = now.toLocaleString('sv-SE', options).replace(',', '');
        
        // Prevent timestamp collisions
        if (timestamp === this.lastTimestamp) {
            this.counter++;
            timestamp += `-${this.counter}`;
        } else {
            this.lastTimestamp = timestamp;
            this.counter = 0;
        }
        
        return CommentSanitizer.escapeHtml(timestamp);
    }
}

// CommentModalManager - HTML endast i visning
class CommentModalManager {
    constructor(modalId = 'commentModal') {
        this.modalId = modalId;
        this.modal = null;
        this.input = null;
        this.timestamp = null;
        this.title = null;
        this.currentRow = null;
        this.commentType = null;
        this.tables = {};
        this.eventListeners = [];
        this.isInitialized = false;
        this.onCommentUpdate = null; // Callback för externa uppdateringar
        
        this.init();
    }
    
    init() {
        try {
            this.createModalIfNotExists();
            this.modal = document.getElementById(this.modalId);
            this.input = document.getElementById('commentInput');
            this.timestamp = document.getElementById('commentTimestamp');
            this.title = document.getElementById('modalCommentTitle');
            
            if (!this.modal || !this.input || !this.timestamp || !this.title) {
                throw new Error('Required modal elements not found');
            }
            
            this.setupEventListeners();
            this.isInitialized = true;
        } catch (error) {
            console.error('CommentModalManager initialization failed:', error);
        }
    }
    
    createModalIfNotExists() {
        if (!document.getElementById(this.modalId)) {
const modalHtml = `
  <div id="${this.modalId}" class="tab-modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="modalCommentTitle">
    <div class="tab-modal-content">
      <div class="tab-modal-header">
        <h4 id="modalCommentTitle" class="tab-modal-title">Comments</h4>
      </div>
      <div class="tab-modal-body">
        <div id="commentsContainer" class="comments-container"></div>
        <textarea id="commentInput" class="tab-modal-textarea" placeholder="Add a comment..." rows="3"></textarea>
        <div class="tab-modal-timestamp" id="commentTimestamp"></div>
      </div>
      <div class="tab-modal-footer tab-modal-buttons">
        <button id="saveComment" type="button" class="tab-modal-btn tab-modal-confirm">Add Comment</button>
        <button id="cancelComment" type="button" class="tab-modal-btn tab-modal-cancel">Close</button>
      </div>
    </div>
  </div>
`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    }
    
    setCommentUpdateCallback(callback) {
        this.onCommentUpdate = callback;
    }
    
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        this.isInitialized = false;
    }
    
    addEventListenerTracked(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }
    
    registerTable(name, tableInstance) {
        this.tables[name] = tableInstance;
    }
    
    updateTableCell(tableName, row, fieldName) {
        const table = this.tables[tableName];
        if (table && row) {
            try {
                row.reformat();
            } catch (error) {
                console.warn('Cell update failed, using table redraw:', error);
                table.redraw(true);
            }
        }
    }
    
    createCommentsContainer() {
        let commentsContainer = document.getElementById('commentsContainer');
        if (!commentsContainer) {
            commentsContainer = document.createElement('div');
            commentsContainer.id = 'commentsContainer';
            commentsContainer.className = 'comments-container';
            commentsContainer.style.cssText = `
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 16px;
                border: 1px solid #eee;
                border-radius: 4px;
                padding: 10px;
            `;
            
            const modalBody = document.querySelector('.tab-modal-body');
            if (modalBody) {
                modalBody.insertBefore(commentsContainer, this.input);
            }
        }
        return commentsContainer;
    }
    
    // Konvertera text till HTML för visning i overlay
    convertTextToDisplayHtml(text) {
        if (!text || typeof text !== 'string') return '';
        
        // 1. Auto-länka URLs och emails
        let html = CommentSanitizer.autoLinkUrls(text);
        
        // 2. Säkerställ att resultatet är säkert
        html = CommentSanitizer.sanitizeHtml(html);
        
        return html;
    }
    
    buildCommentsList(comments, container) {
        // Kommentarerna är redan text-saniterade, konvertera endast för visning
        const sanitizedComments = CommentSanitizer.sanitizeComments(comments, { allowHtml: false });
        
        const fragment = document.createDocumentFragment();
        
        const sortedComments = [...sanitizedComments].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp));
        
        sortedComments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            fragment.appendChild(commentElement);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }
    
    createCommentElement(comment) {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';
        commentElement.style.cssText = `
            border-bottom: 1px solid #eee;
            padding: 8px 0;
            margin-bottom: 8px;
        `;
        
        const commentText = document.createElement('div');
        // Konvertera text till HTML med länkar ENDAST för visning
        commentText.innerHTML = this.convertTextToDisplayHtml(comment.text);
        commentText.style.marginBottom = '4px';
        
        const commentTime = document.createElement('div');
        commentTime.textContent = comment.timestamp;
        commentTime.style.cssText = `
            font-size: 12px;
            color: #777;
        `;
        
        commentElement.appendChild(commentText);
        commentElement.appendChild(commentTime);
        
        return commentElement;
    }
    
    show(row, itemName, type = 'item') {
        if (!this.isInitialized) {
            console.error('CommentModalManager not properly initialized');
            return;
        }
        
        this.currentRow = row;
        this.commentType = type;
        
        const fieldName = this.getCommentFieldName(type);
        const rawComments = row.getData()[fieldName] || [];
        
        // Sanitera endast text - INGEN auto-linking av lagad data
        const comments = CommentSanitizer.sanitizeComments(rawComments, { allowHtml: false });
        
        this.title.textContent = `Comments for ${CommentSanitizer.escapeHtml(itemName)}`;
        
        const commentsContainer = this.createCommentsContainer();
        
        if (comments.length > 0) {
            this.buildCommentsList(comments, commentsContainer);
            this.timestamp.textContent = `${comments.length} comment${comments.length !== 1 ? 's' : ''}`;
        } else {
            commentsContainer.innerHTML = '<p style="color: #888; font-style: italic; text-align: center;">No comments yet</p>';
            this.timestamp.textContent = 'No comments yet';
        }
        
        this.input.value = '';
        this.input.disabled = false;
        this.input.placeholder = 'Add a new comment... (URLs and emails will be auto-linked)';
        this.input.maxLength = 1000;
        
        document.getElementById('saveComment').textContent = 'Add Comment';
        document.getElementById('cancelComment').textContent = 'Close';
        
        this.modal.style.display = 'block';
        setTimeout(() => this.modal.classList.add('active'), 50);
        this.input.focus();
    }
    
    hide() {
        if (this.modal) {
            this.modal.classList.remove('active');
            setTimeout(() => {
                this.modal.style.display = 'none';
                this.currentRow = null;
                this.commentType = null;
            }, 300);
        }
    }
    
    getCommentFieldName(type) {
        const fieldMap = {
            'project': 'prj_comments',
            'part': 'prt_comments',
            'item': 'itm_comments',
            'task': 'tsk_comments'
        };
        return fieldMap[type] || 'itm_comments';
    }
    
    getAssociatedTableName(type) {
        const tableMap = {
            'project': 'projectTable',
            'part': 'partTable',
            'item': 'itemTable',
            'task': 'taskTable'
        };
        return tableMap[type] || 'itemTable';
    }
    
    saveComment() {
        if (!this.currentRow || !this.input) return;
        
        // Validera ENDAST text - ingen HTML-processning
        const validation = CommentValidator.validate(this.input.value, { allowHtml: false });
        if (!validation.isValid) {
            alert('Error: ' + validation.errors[0]);
            this.input.focus();
            return;
        }
        
        // Spara som REN TEXT - ingen auto-linking i sparad data
        const newComment = {
            text: validation.text, // Ren text utan HTML
            timestamp: TimestampManager.generate()
        };
        
        const fieldName = this.getCommentFieldName(this.commentType);
        const rowData = this.currentRow.getData();
        
        if (!rowData[fieldName]) {
            rowData[fieldName] = [];
        }
        
        rowData[fieldName].push(newComment);
        // Sanitera endast text, ingen HTML
        rowData[fieldName] = CommentSanitizer.sanitizeComments(rowData[fieldName], { allowHtml: false });
        
        this.currentRow.update({...rowData});
        
        // Kalla extern callback för uppdateringar (skickar ren text till AJAX)
        if (this.onCommentUpdate) {
            this.onCommentUpdate(this.commentType, rowData, fieldName, newComment);
        }
        
        const tableName = this.getAssociatedTableName(this.commentType);
        this.updateTableCell(tableName, this.currentRow, fieldName);
        
        const commentsContainer = document.getElementById('commentsContainer');
        if (commentsContainer && commentsContainer.children.length > 0) {
            // Skapa element med HTML-länkar för visning
            const newCommentElement = this.createCommentElement(newComment);
            commentsContainer.insertBefore(newCommentElement, commentsContainer.firstChild);
        } else {
            this.buildCommentsList(rowData[fieldName], commentsContainer);
        }
        
        this.timestamp.textContent = `${rowData[fieldName].length} comment${rowData[fieldName].length !== 1 ? 's' : ''}`;
        
        this.input.value = '';
        this.input.focus();
        
        commentsContainer.scrollTop = 0;
    }
    
    handleCancel() {
        this.hide();
    }

    setupEventListeners() {
        const saveBtn = document.getElementById('saveComment');
        const cancelBtn = document.getElementById('cancelComment');
        
        if (saveBtn) {
            const saveHandler = () => this.saveComment();
            this.addEventListenerTracked(saveBtn, 'click', saveHandler);
        }
        
        if (cancelBtn) {
            const cancelHandler = () => this.handleCancel();
            this.addEventListenerTracked(cancelBtn, 'click', cancelHandler);
        }
        
        if (this.modal) {
            const outsideClickHandler = (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            };
            this.addEventListenerTracked(this.modal, 'click', outsideClickHandler);
        }
        
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display === 'block') {
                this.hide();
            }
        };
        this.addEventListenerTracked(document, 'keydown', escapeHandler);
        
        if (this.input) {
            const enterHandler = (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.saveComment();
                }
            };
            this.addEventListenerTracked(this.input, 'keydown', enterHandler);
        }
    }
}

// CommentFormatter för tabellvisning - endast text med badge
class CommentFormatter {
    static format(cell, type = 'item') {
        const fieldName = {
            'project': 'prj_comments',
            'part': 'prt_comments', 
            'item': 'itm_comments',
            'task': 'tsk_comments'
        }[type] || 'itm_comments';
        
        const rawComments = cell.getValue() || [];
        const comments = CommentSanitizer.sanitizeComments(rawComments, { allowHtml: false });
        const count = comments.length;
        
        const element = document.createElement('div');
        element.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
        `;
        
        const textSpan = document.createElement('span');
        
        if (count > 0) {
            const latestComment = comments[comments.length - 1];
            
            if (latestComment && latestComment.text) {
                // Visa endast text i tabellcellen (ingen HTML)
                const textContent = latestComment.text;
                
                if (textContent.length > 30) {
                    const truncated = textContent.substring(0, 30) + "...";
                    textSpan.textContent = truncated;
                    textSpan.title = textContent; // Tooltip med full text
                } else {
                    textSpan.textContent = textContent;
                }
            } else {
                textSpan.textContent = "Invalid comment";
                textSpan.style.color = '#ff6b6b';
            }
        } else {
            textSpan.textContent = "Add comment...";
            textSpan.style.cssText = `
                font-style: italic;
                color: #888;
            `;
        }
        
        element.appendChild(textSpan);
        
        if (count > 0) {
            const badge = document.createElement('span');
            badge.textContent = count;
            badge.style.cssText = `
                background-color: #4a90e2;
                color: white;
                border-radius: 12px;
                padding: 2px 8px;
                font-size: 12px;
                font-weight: bold;
                margin-left: 10px;
            `;
            
            element.appendChild(badge);
        }
        
        return element;
    }
}

// Main module class
class TabulatorCommentsModule {
    constructor(config = {}) {
        this.modalId = config.modalId || 'commentModal';
        this.commentManager = null;
        this.isInitialized = false;
        
        this.config = {
            maxCommentLength: Math.min(config.maxCommentLength || 1000, 1000),
            minCommentLength: Math.max(config.minCommentLength || 2, 1),
            truncateLength: Math.min(config.truncateLength || 30, 100),
            ...config
        };
    }
    
    async init() {
        try {
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            this.commentManager = new CommentModalManager(this.modalId);
            
            if (!this.commentManager.isInitialized) {
                throw new Error('Comment modal manager failed to initialize');
            }
            
            this.isInitialized = true;
            return this;
        } catch (error) {
            console.error('TabulatorCommentsModule initialization failed:', error);
            throw error;
        }
    }
    
    registerTable(name, tableInstance) {
        if (this.commentManager) {
            this.commentManager.registerTable(name, tableInstance);
        }
    }
    
    setCommentUpdateCallback(callback) {
        if (this.commentManager) {
            this.commentManager.setCommentUpdateCallback(callback);
        }
    }
    
    createCommentColumn(type, itemNameField, options = {}) {
        const fieldName = {
            'project': 'prj_comments',
            'part': 'prt_comments',
            'item': 'itm_comments', 
            'task': 'tsk_comments'
        }[type];
        
        return {
            title: CommentSanitizer.escapeHtml(options.title || "Comments"),
            field: fieldName,
            width: Math.max(Math.min(options.width || 200, 500), 100),
            formatter: (cell) => CommentFormatter.format(cell, type),
            cellClick: (e, cell) => {
                if (!this.isInitialized) {
                    console.error('Comments module not initialized');
                    return;
                }
                
                const rowData = cell.getRow().getData();
                const displayName = CommentSanitizer.escapeHtml(rowData[itemNameField] || 'Item');
                this.commentManager.show(cell.getRow(), displayName, type);
            },
            headerSort: false
        };
    }
    
    destroy() {
        if (this.commentManager) {
            this.commentManager.destroy();
        }
        this.isInitialized = false;
    }
}

// ======= COMMENT HANDLERS =======
/**
 * Hanterar uppdatering av kommentarer via AJAX
 */
const handleCommentUpdate = (entityType, rowData, fieldName, newComment) => {
  let ajaxData = {
    action: "updateComment",
    entityType,
    fieldName,
    comment: newComment
  };
  switch (entityType) {
    case 'part':
      ajaxData.prt_id = rowData.prt_id; ajaxData.prt_name = rowData.prt_name; break;
    case 'item':
      ajaxData.itm_id = rowData.itm_id; ajaxData.itm_name = rowData.itm_name; ajaxData.itm_prt_id = rowData.itm_prt_id; break;
    case 'task':
      ajaxData.tsk_id = rowData.tsk_id; ajaxData.tsk_name = rowData.tsk_name; ajaxData.tsk_itm_id = rowData.tsk_itm_id; break;
  }
  ajaxHandler.queuedEchoAjax(ajaxData);
  console.log('Comment AJAX sent:', ajaxData);
};

/**
 * Initialiserar kommentarsmodulen med standardkonfiguration
 */
const initCommentsModule = async () => {
  try {
    const commentsModule = new TabulatorCommentsModule({
      modalId: 'commentModal',
      allowHtml: true,
      maxCommentLength: 1000
    });
    await commentsModule.init();
    commentsModule.setCommentUpdateCallback(handleCommentUpdate);
    return commentsModule;
  } catch (error) {
    console.error('Failed to initialize comments module:', error);
    return null;
  }
};

// Export för användning
export {
    TabulatorCommentsModule,
    CommentFormatter,
    CommentValidator,
    CommentSanitizer,
    TimestampManager,
    CommentModalManager,
    handleCommentUpdate,
    initCommentsModule
};

// Fallback för äldre import-system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TabulatorCommentsModule,
        CommentFormatter,
        CommentValidator,
        CommentSanitizer,
        TimestampManager,
        CommentModalManager,
        handleCommentUpdate,
        initCommentsModule
    };
}

// Globala variabler för kompatibilitet
if (typeof window !== 'undefined') {
    window.TabulatorCommentsModule = TabulatorCommentsModule;
    window.CommentFormatter = CommentFormatter;
    window.CommentValidator = CommentValidator;
    window.CommentSanitizer = CommentSanitizer;
    window.TimestampManager = TimestampManager;
    window.CommentModalManager = CommentModalManager;
    window.handleCommentUpdate = handleCommentUpdate;
    window.initCommentsModule = initCommentsModule;
}
