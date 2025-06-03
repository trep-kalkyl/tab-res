generateLinks(baseValue, itemType, materialName = '') {
        // Use empty string if baseValue is missing or empty
        const searchValue = baseValue || '';
        let links = [];
        
        switch(itemType) {
            case "SV-ENR":
                links = [
                    { name: "Google Type 1", url: `https://www.google.com/search?q=${searchValue}&type=1` },
                    { name: "Bing Type 1", url: `https://www.bing.com/search?q=${searchValue}&type=1` }
                ];
                break;
            case "Type 2":
                links = [
                    { name: "Google Type 2", url: `https://www.google.com/search?q=${searchValue}&type=2` },
                    { name: "Bing Type 2", url: `https://www.bing.com/search?q=${searchValue}&type=2` }
                ];
                break;
            case "Type 5":
                links = [
                    { name: "Google Type 5", url: `https://www.google.com/search?q=${searchValue}&type=5` },
                    { name: "Bing Type 5", url: `https://www.bing.com/search?q=${searchValue}&type=5` }
                ];
                break;
            default:
                // Generate links for material number, type, and name
                const materialNameValue = materialName || '';
                
                links = [
                    { name: "Google Material Number", url: `https://www.google.com/search?q=${searchValue}` },
                    { name: "Bing Material Number", url: `https://www.bing.com/search?q=${searchValue}` }
                ];
                
                // Add material name search if available
                if (materialNameValue) {
                    links.push(
                        { name: "Google Material Name", url: `https://www.google.com/search?q=${materialNameValue}` },
                        { name: "Bing Material Name", url: `https://www.bing.com/search?q=${materialNameValue}` }
                    );
                }
                
                // Add combined search if both values are available
                if (searchValue && materialNameValue) {
                    links.push(
                        { name: "Google Combined Search", url: `https://www.google.com/search?q=${searchValue} ${materialNameValue}` },
                        { name: "Bing Combined Search", url: `https://www.bing.com/search?q=${searchValue} ${materialNameValue}` }
                    );
                }
                break;
        }
        return links;
    },/**
 * linksModalUtils.js
 * 
 * Utility for showing a modal with dynamic search links.
 * 
 * Usage:
 *   import linksModalUtils from "https://cdn.jsdelivr.net/gh/trep-kalkyl/tab-res@main/linksModalUtils.js";
 *   linksModalUtils.init();
 *   ...
 *   linksModalUtils.show(baseValue, itemType);
 */
const linksModalUtils = {
    init() {
        this.modal = document.getElementById('linksModal');
        this.linksContainer = document.getElementById('linksContainer');
        this.title = document.getElementById('modalLinksTitle');
        // Close button
        document.getElementById('closeLinks').addEventListener('click', () => this.hide());
        // Click outside modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') this.hide();
        });
    },
    generateLinks(baseValue, itemType, materialNumber = '', materialType = '') {
        // Use empty string if baseValue is missing or empty
        const searchValue = baseValue || '';
        let links = [];
        
        switch(itemType) {
            case "SV-ENR":
                links = [
                    { name: "Google Type 1", url: `https://www.google.com/search?q=${searchValue}&type=1` },
                    { name: "Bing Type 1", url: `https://www.bing.com/search?q=${searchValue}&type=1` }
                ];
                break;
            case "Type 2":
                links = [
                    { name: "Google Type 2", url: `https://www.google.com/search?q=${searchValue}&type=2` },
                    { name: "Bing Type 2", url: `https://www.bing.com/search?q=${searchValue}&type=2` }
                ];
                break;
            case "Type 5":
                links = [
                    { name: "Google Type 5", url: `https://www.google.com/search?q=${searchValue}&type=5` },
                    { name: "Bing Type 5", url: `https://www.bing.com/search?q=${searchValue}&type=5` }
                ];
                break;
            default:
                // Generate links for material number and type in default case
                const materialNum = materialNumber || '';
                const materialTp = materialType || '';
                
                links = [
                    { name: "Google Search", url: `https://www.google.com/search?q=${searchValue}` },
                    { name: "Bing Search", url: `https://www.bing.com/search?q=${searchValue}` }
                ];
                
                // Add material number search if available
                if (materialNum) {
                    links.push(
                        { name: "Google Material Number", url: `https://www.google.com/search?q=${materialNum}` },
                        { name: "Bing Material Number", url: `https://www.bing.com/search?q=${materialNum}` }
                    );
                }
                
                // Add material type search if available
                if (materialTp) {
                    links.push(
                        { name: "Google Material Type", url: `https://www.google.com/search?q=${materialTp}` },
                        { name: "Bing Material Type", url: `https://www.bing.com/search?q=${materialTp}` }
                    );
                }
                break;
        }
        return links;
    },
    show(baseValue, itemType, materialName = '') {
        // Always show modal, even if data is missing
        const displayValue = baseValue || '[No Value]';
        const displayType = itemType || 'Unknown';
        
        this.title.textContent = `Search Links for ${displayType}: ${displayValue}`;
        const links = this.generateLinks(baseValue, itemType, materialName);
        this.linksContainer.innerHTML = links
            .map(link => `
                <div class="tab-modal-link-item">
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.name}</a>
                </div>
            `).join("");
        this.modal.style.display = 'flex';
        setTimeout(() => this.modal.classList.add('active'), 50);
    },
    hide() {
        this.modal.classList.remove('active');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }
};
export default linksModalUtils;
