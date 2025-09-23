/**
 * ColumnControls.js
 * Ultra-lightweight column visibility control for Tabulator.js v6+
 * Modern ES6 module, no dependencies.
 * Usage: import and instantiate per Tabulator instance.
 *
 * API:
 *   new ColumnControls(tabulatorInstance, { buttonText: "Kolumner" })
 *   .destroy() // cleanup
 *   .toggle()  // toggle menu
 *
 * Excludes internal fields automatically (delete, toggleSubtable, export etc).
 * Styling can be customized via .cc-btn, .cc-menu, .cc-item classes.
 */

export class ColumnControls {
  /**
   * @param {Tabulator} table - Tabulator instance
   * @param {Object} options - { buttonText: "Kolumner" }
   */
  constructor(table, options = {}) {
    this.table = table;
    this.buttonText = options.buttonText || "Kolumner";
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "cc-btn";
    this.button.textContent = this.buttonText;

    // Dropdown menu
    this.menu = document.createElement("div");
    this.menu.className = "cc-menu";
    this.menu.style.display = "none";
    this.menu.style.position = "absolute";
    this.menu.style.zIndex = 9999;
    this.menu.setAttribute("role", "menu");

    // Add minimal CSS only once
    if (!document.getElementById("cc-style")) {
      const style = document.createElement("style");
      style.id = "cc-style";
      style.textContent = `
        .cc-btn {
          background: #fff;
          border: 1px solid #c7d2fe;
          color: #1f2937;
          padding: 7px 16px;
          border-radius: 7px;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 2px 8px #0001;
          margin-left: 6px;
        }
        .cc-btn:hover { background: #f3f4f6; }
        .cc-menu {
          background: #fff;
          border: 1px solid #c7d2fe;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.18);
          padding: 10px 18px 10px 18px;
          min-width: 160px;
        }
        .cc-header {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .cc-item {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 4px 0;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.13s;
        }
        .cc-item:hover { background: #f3f4f6; }
        .cc-item input[type="checkbox"] { margin-right: 6px; }
      `;
      document.head.appendChild(style);
    }

    // Build menu content on open
    this.button.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Hide menu when clicking outside
    this._outsideHandler = (e) => {
      if (!this.menu.contains(e.target) && e.target !== this.button) {
        this.close();
      }
    };
    document.addEventListener("click", this._outsideHandler);

    // Place menu (fixed, under button)
    this.button.addEventListener("click", () => {
      if (this.menu.style.display === "block") {
        this.close();
        return;
      }
      this.renderMenu();
      // Position menu below button
      const rect = this.button.getBoundingClientRect();
      this.menu.style.top = (rect.bottom + 4 + window.scrollY) + "px";
      this.menu.style.left = (rect.left + window.scrollX) + "px";
    });

    // Expose for easy DOM placement
    // Usage: container.appendChild(columnControls.button)
    //        document.body.appendChild(columnControls.menu)
    document.body.appendChild(this.menu);
  }

  /**
   * Renders the dropdown with all user-toggleable columns.
   */
  renderMenu() {
    this.menu.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "cc-header";
    header.textContent = "Visa/Dölj kolumner";
    this.menu.appendChild(header);

    // List columns
    const columns = this.table.getColumns();
    columns.forEach((col, idx) => {
      const def = col.getDefinition();
      const field = col.getField?.(); // may be undefined for non-data columns

      // Internal/excluded columns
      const excludeFields = [
        "toggleSubtable",
        "item_export",
        "part_export",
        "task_export",
        "prt_comments", "itm_comments", "tsk_comments",
        "prt_tags", "itm_tags", "tsk_tags",
        "selected", // markerad
        "" // no field
      ];
      // Hide for first column (often delete or toggle)
      if (!field || excludeFields.includes(field) || idx === 0) return;

      // UI
      const label = document.createElement("label");
      label.className = "cc-item";
      label.setAttribute("tabindex", "0");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = col.isVisible();
      checkbox.tabIndex = -1;
      checkbox.addEventListener("change", (e) => {
        if (checkbox.checked) col.show();
        else col.hide();
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(def.title || field));
      this.menu.appendChild(label);
    });
  }

  /**
   * Toggle menu dropdown open/close.
   */
  toggle() {
    if (this.menu.style.display === "block") {
      this.close();
    } else {
      this.menu.style.display = "block";
    }
  }

  /**
   * Close the dropdown menu.
   */
  close() {
    this.menu.style.display = "none";
  }

  /**
   * Cleanup all DOM and handlers.
   */
  destroy() {
    document.removeEventListener("click", this._outsideHandler);
    if (this.menu.parentNode) this.menu.parentNode.removeChild(this.menu);
    if (this.button.parentNode) this.button.parentNode.removeChild(this.button);
  }
}

export default ColumnControls;
