// materialLinks.js - Material Links Module for Task Tables

export const MaterialLinksModule = {
    // Configuration
    config: {
        materialTypes: ["SV-ENR", "Type 2", "Type 5"],
        selectors: {
            modal: 'linksModal',
            container: 'linksContainer',
            title: 'modalLinksTitle'
        }
    },

    // Properties
    modal: null,
    linksContainer: null,
    title: null,
    initialized: false,

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
    },

    vibrate() {
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    },

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
    },

    // Links modal utility
    linksModalUtils: {
        // Generate links based on item type
        generateLinks(materialNumber, materialName, itemType) {
            let links = [];
            const numberAndName = `${materialNumber || ''} ${materialName || ''}`.trim();
            const encodedNumber = encodeURIComponent(materialNumber || '');
            const encodedName = encodeURIComponent(materialName || '');
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
                default:
                    links = [
                        { name: "Google Search (Number + Name)", url: `https://www.google.com/search?q=${encodedNumberAndName}` },
                        { name: "Bing Search (Number + Name)", url: `https://www.bing.com/search?q=${encodedNumberAndName}` }
                    ];
            }
            return links;
        },

        show(materialNumber, materialName, itemType, parentModule) {
            if (!materialNumber && !materialName) {
                alert("No Data Available: Both material number and name are missing.");
                return;
            }

            // Set modal title with integrated copy icons
            parentModule.title.innerHTML = `
                Search Links for ${itemType || 'Material'}: 
                ${materialNumber || 'No Number'} 
                <button class="tsk-material-inline-copy-btn" onclick="MaterialLinksModule.copyToClipboard('${materialNumber || ''}', 'Artikelnummer')" title="Kopiera artikelnummer">📋</button>
                - ${materialName || 'No Name'} 
                <button class="tsk-material-inline-copy-btn" onclick="MaterialLinksModule.copyToClipboard('${materialName || ''}', 'Materialnamn')" title="Kopiera materialnamn">📝</button>
            `;

            // Generate and display links
            const links = this.generateLinks(materialNumber, materialName, itemType);
            const linksList = links
                .map(link => `
                    <div class="tab-modal-link-item">
                        <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.name}</a>
                    </div>
                `).join("");

            parentModule.linksContainer.innerHTML = linksList;

            // Show modal
            parentModule.modal.style.display = 'flex';
            setTimeout(() => parentModule.modal.classList.add('active'), 50);
        },

        hide(parentModule) {
            parentModule.modal.classList.remove('active');
            setTimeout(() => {
                parentModule.modal.style.display = 'none';
            }, 300);
        }
    },

    // Function to update material link column for a specific row
    updateMaterialLinkColumn(row) {
        row.reformat();
    },

    // Get column configuration for material fields
    getMaterialColumns() {
        return [
            {
                title: "Material Number",
                field: "tsk_material_number",
                editor: "input",
                cellEdited: function(cell) {
                    MaterialLinksModule.updateMaterialLinkColumn(cell.getRow());
                }
            },
            {
                title: "Material Name", 
                field: "tsk_material_name",
                editor: "input",
                cellEdited: function(cell) {
                    MaterialLinksModule.updateMaterialLinkColumn(cell.getRow());
                }
            },
            {
                title: "Material Type",
                field: "tsk_material_type",
                editor: "list",
                editorParams: {
                    values: MaterialLinksModule.config.materialTypes
                },
                cellEdited: function(cell) {
                    MaterialLinksModule.updateMaterialLinkColumn(cell.getRow());
                }
            },
            {
                title: "Material Links",
                field: "tsk_material_link",
                formatter: function(cell) {
                    const rowData = cell.getRow().getData();
                    const itemType = rowData.tsk_material_type;
                    const materialNumber = rowData.tsk_material_number;
                    const materialName = rowData.tsk_material_name;
                    
                    // Only show links if we have some data
                    if (!materialNumber && !materialName) {
                        return '<span class="link-like-text">Show Links (0)</span>';
                    }
                    
                    const links = MaterialLinksModule.linksModalUtils.generateLinks(materialNumber, materialName, itemType);
                    const linkCount = links.length;
                    return `<span class="link-like-text">Show Links (${linkCount})</span>`;
                },
                cellClick: function(e, cell) {
                    const rowData = cell.getRow().getData();
                    MaterialLinksModule.linksModalUtils.show(
                        rowData.tsk_material_number,
                        rowData.tsk_material_name,
                        rowData.tsk_material_type,
                        MaterialLinksModule
                    );
                },
                width: 120,
                hozAlign: "center"
            }
        ];
    },

    // Initialize the module
    init() {
        if (this.initialized) return;
        
        // Set up DOM references
        this.modal = document.getElementById(this.config.selectors.modal);
        this.linksContainer = document.getElementById(this.config.selectors.container);
        this.title = document.getElementById(this.config.selectors.title);

        // Check if required DOM elements exist
        if (!this.modal || !this.linksContainer || !this.title) {
            console.warn('MaterialLinksModule: Required DOM elements not found');
            return;
        }

        // Set up event listeners
        this.setupEventListeners();
        this.initialized = true;
    },

    setupEventListeners() {
        // Handle close button
        const closeBtn = document.getElementById('closeLinks');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.linksModalUtils.hide(this);
            });
        }

        // Handle click outside
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.linksModalUtils.hide(this);
                }
            });
        }

        // Handle Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
                this.linksModalUtils.hide(this);
            }
        });
    }
};

// Export default
export default MaterialLinksModule;
