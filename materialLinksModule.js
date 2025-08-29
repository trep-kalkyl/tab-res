// ======= MATERIAL LINKS MODULE =======
export class MaterialLinksModule {
    constructor() {
        this.config = {
            materialTypes: ["SV-ENR", "Type 2", "Type 5"],
            selectors: {
                modal: 'linksModal',
                container: 'linksContainer',
                title: 'modalLinksTitle'
            }
        };
        this.modal = null;
        this.linksContainer = null;
        this.title = null;
    }

    // Global copy function
    async copyToClipboard(text, fieldName) {
        if (!text) {
            this.showMobileToast(`${fieldName} är tomt`);
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            this.showMobileToast(`${fieldName} kopierat! ✓`);
            this.vibrate();
        } catch (err) {
            // Fallback för äldre browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showMobileToast(`${fieldName} kopierat! ✓`);
            this.vibrate();
        }
    }

    vibrate() {
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    showMobileToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; 
            bottom: 100px; left: 50%; transform: translateX(-50%);
            background: rgba(40, 167, 69, 0.9); color: white;
            padding: 12px 24px; border-radius: 25px;
            font-size: 16px; z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 2000);
    }

    // Generate links based on item type
    generateLinks(materialNumber, materialName, itemType) {
        let links = [];
        const numberAndName = `${materialNumber} ${materialName}`.trim();
        const encodedNumber = encodeURIComponent(materialNumber);
        const encodedName = encodeURIComponent(materialName);
        const encodedNumberAndName = encodeURIComponent(numberAndName);

        switch(itemType) {
            case "SV-ENR":
                links = [
                    { name: "Google SV-ENR (Number + Name)", url: `https://www.google.com/search?q=${encodedNumberAndName}&type=sv-enr` },
                    { name: "Bing SV-ENR (Number + Name)", url: `https://www.bing.com/search?q=${encodedNumberAndName}&type=sv-enr` },
                    { name: "SV-ENR Database (Number)", url: `https://database.sv-enr.com/search?q=${encodedNumber}` },
                    { name: "Technical Specs (Name)", url: `https://specs.sv-enr.com/search?name=${encodedName}` },
                    { name: "SV-ENR Documentation (Number)", url: `https://docs.sv-enr.com/materials/${encodedNumber}` }
                ];
                break;
            case "Type 2":
                links = [
                    { name: "Google Type 2 (Number + Name)", url: `https://www.google.com/search?q=${encodedNumberAndName}&type=2` },
                    { name: "Bing Type 2 (Name only)", url: `https://www.bing.com/search?q=${encodedName}&type=2` },
                    { name: "Type 2 Catalog (Number)", url: `https://catalog.type2.com/item/${encodedNumber}` }
                ];
                break;
            case "Type 5":
                links = [
                    { name: "Google Type 5 (Number + Name)", url: `https://www.google.com/search?q=${encodedNumberAndName}&type=5` },
                    { name: "Bing Type 5 (Name only)", url: `https://www.bing.com/search?q=${encodedName}&type=5` },
                    { name: "Type 5 Portal (Number)", url: `https://portal.type5.com/search/${encodedNumber}` },
                    { name: "Type 5 Manual (Name)", url: `https://manual.type5.com/materials?name=${encodedName}` },
                    { name: "Type 5 Support (Number)", url: `https://support.type5.com/item/${encodedNumber}` },
                    { name: "Type 5 Community (Number + Name)", url: `https://community.type5.com/discuss?q=${encodedNumberAndName}` },
                    { name: "Type 5 Downloads (Name)", url: `https://downloads.type5.com/search?name=${encodedName}` }
                ];
                break;
        }
        return links;
    }

    showLinksModal(materialNumber, materialName, itemType) {
        if (!materialNumber || !itemType) {
            alert("No Data Available: The necessary item data is missing.");
            return;
        }

        // Säkerställ att modal finns
        if (!this.modal) {
            this.createModal();
        }

        // Set modal title with integrated copy icons
        this.title.innerHTML = `
            Search Links for ${itemType}: 
            ${materialNumber} 
            <button class="tsk-material-inline-copy-btn" onclick="window.materialLinksModule.copyToClipboard('${materialNumber}', 'Artikelnummer')" title="Kopiera artikelnummer">📋</button>
            - ${materialName || 'No Name'} 
            <button class="tsk-material-inline-copy-btn" onclick="window.materialLinksModule.copyToClipboard('${materialName || ''}', 'Materialnamn')" title="Kopiera materialnamn">📝</button>
        `;

        // Generate and display links
        const links = this.generateLinks(materialNumber, materialName, itemType);
        const linksList = links
            .map(link => `
                <div class="tab-modal-link-item">
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.name}</a>
                </div>
            `).join("");

        this.linksContainer.innerHTML = linksList;

        // Show modal
        this.modal.style.display = 'flex';
        setTimeout(() => this.modal.classList.add('active'), 50);
    }

    hideLinksModal() {
        if (!this.modal) return;
        
        this.modal.classList.remove('active');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }

    createModal() {
        // Skapa modal HTML om den inte finns
        const modalHTML = `
            <div id="${this.config.selectors.modal}" class="tab-modal">
                <div class="tab-modal-content">
                    <div class="tab-modal-header">
                        <h3 id="${this.config.selectors.title}">Material Links</h3>
                        <button id="closeLinks" class="tab-modal-close">&times;</button>
                    </div>
                    <div id="${this.config.selectors.container}" class="tab-modal-body">
                        <!-- Links will be populated here -->
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Sätt upp referenser
        this.modal = document.getElementById(this.config.selectors.modal);
        this.linksContainer = document.getElementById(this.config.selectors.container);
        this.title = document.getElementById(this.config.selectors.title);

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle close button
        document.getElementById('closeLinks').addEventListener('click', () => {
            this.hideLinksModal();
        });

        // Handle click outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideLinksModal();
            }
        });

        // Handle Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
                this.hideLinksModal();
            }
        });
    }

    // Skapa Material Link kolumn för Tabulator
    createMaterialLinkColumn() {
        return {
            title: "Material Link",
            field: "tsk_material_link",
            width: 120,
            formatter: (cell) => {
                const rowData = cell.getRow().getData();
                const itemType = rowData.tsk_material_type;
                const materialNumber = rowData.tsk_material_number;
                const materialName = rowData.tsk_material_name;
                
                // Only show links if both number and type are present
                if (!materialNumber || !itemType) {
                    return '<span class="link-like-text">Show Links (0)</span>';
                }
                
                const links = this.generateLinks(materialNumber, materialName, itemType);
                const linkCount = links.length;
                return `<span class="link-like-text">Show Links (${linkCount})</span>`;
            },
            cellClick: (e, cell) => {
                const rowData = cell.getRow().getData();
                this.showLinksModal(
                    rowData.tsk_material_number,
                    rowData.tsk_material_name,
                    rowData.tsk_material_type
                );
            },
            headerSort: false
        };
    }

    // Hämta material types för dropdown
    getMaterialTypes() {
        return this.config.materialTypes;
    }

    // Initialize the module
    init() {
        // Gör tillgänglig globalt för onclick events
        window.materialLinksModule = this;
    }
}

export default MaterialLinksModule;
