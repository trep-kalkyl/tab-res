/**
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

    generateLinks(baseValue, itemType) {
        let links = [];
        switch(itemType) {
            case "SV-ENR":
                links = [
                    { name: "Google Type 1", url: `https://www.google.com/search?q=${baseValue}&type=1` },
                    { name: "Bing Type 1", url: `https://www.bing.com/search?q=${baseValue}&type=1` }
                ];
                break;
            case "Type 2":
                links = [
                    { name: "Google Type 2", url: `https://www.google.com/search?q=${baseValue}&type=2` },
                    { name: "Bing Type 2", url: `https://www.bing.com/search?q=${baseValue}&type=2` }
                ];
                break;
            case "Type 5":
                links = [
                    { name: "Google Type 5", url: `https://www.google.com/search?q=${baseValue}&type=5` },
                    { name: "Bing Type 5", url: `https://www.bing.com/search?q=${baseValue}&type=5` }
                ];
                break;
        }
        return links;
    },

    show(baseValue, itemType) {
        if (!baseValue || !itemType) {
            alert("No Data Available: The necessary item data is missing.");
            return;
        }

        this.title.textContent = `Search Links for ${itemType}: ${baseValue}`;
        const links = this.generateLinks(baseValue, itemType);
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
