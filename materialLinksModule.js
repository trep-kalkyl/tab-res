// ======= MATERIAL LINKS MODULE =======
export const MaterialLinksModule = {
    config: {
        materialTypes: ["SV-ENR", "Type 2", "Type 5"],
    },
    // Generate links for given material number, name, and type
    generateLinks(materialNumber, materialName, itemType) {
        let links = [];
        const numberAndName = `${materialNumber} ${materialName}`.trim();
        const encodedNumber = encodeURIComponent(materialNumber);
        const encodedName = encodeURIComponent(materialName);
        const encodedNumberAndName = encodeURIComponent(numberAndName);

        switch (itemType) {
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
    },

    // Show modal with material links
    showLinksModal(materialNumber, materialName, materialType) {
        if (!materialNumber || !materialType) {
            alert("Ingen artikeldata tillgänglig.");
            return;
        }
        // Create modal if not exists
        let modal = document.getElementById('materialLinksModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'materialLinksModal';
            modal.className = 'material-links-modal';
            modal.innerHTML = `
                <div class="material-links-modal-content">
                    <h3 id="materialLinksModalTitle"></h3>
                    <div id="materialLinksContainer"></div>
                    <button id="closeMaterialLinksModal" style="margin-top:15px;">Stäng</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('closeMaterialLinksModal').onclick = () => this.hideLinksModal();
            // Close on outside click
            modal.onclick = (e) => { if (e.target === modal) this.hideLinksModal(); };
            // Close on escape
            document.addEventListener('keydown', (e) => {
                if (modal.style.display === 'flex' && e.key === 'Escape') this.hideLinksModal();
            });
        }
        // Set modal content
        document.getElementById('materialLinksModalTitle').innerHTML = `
            Sök-länkar för ${materialType}: 
            ${materialNumber} 
            <button class="tsk-material-inline-copy-btn" title="Kopiera artikelnummer"
                onclick="navigator.clipboard && navigator.clipboard.writeText('${materialNumber.replace(/'/g,"\\'") || ""}')">📋</button>
            - ${materialName || 'No Name'} 
            <button class="tsk-material-inline-copy-btn" title="Kopiera materialnamn"
                onclick="navigator.clipboard && navigator.clipboard.writeText('${(materialName||"").replace(/'/g,"\\'")}')">📝</button>
        `;
        const links = this.generateLinks(materialNumber, materialName, materialType);
        document.getElementById('materialLinksContainer').innerHTML = links.map(link =>
            `<div class="tab-modal-link-item"><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.name}</a></div>`
        ).join("");
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 30);
    },
    hideLinksModal() {
        const modal = document.getElementById('materialLinksModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => { modal.style.display = 'none'; }, 250);
        }
    }
};
