# CSS Styleguide – Tabulator.js Project

This document describes the guidelines for using and extending **custom.css** in this project.  
The goal is to ensure **consistent, reusable, and modular** styling for all Tabulator tables and related UI components.

---

## 1. **Location and usage**

- **All custom CSS** must be placed in [`custom.css`](custom.css).
- Never use inline styles in HTML/JS unless strictly necessary for temporary effects.
- Only override Tabulator’s default appearance using your own classes, not by directly changing Tabulator’s CSS.

---

## 2. **Modal Components**

- **All modal overlays** must use `.tab-modal-overlay` and `.tab-modal-content`.
- The modal title should always use `.tab-modal-title`.
- Modal buttons must use:
  - `.tab-modal-btn` (base)
  - `.tab-modal-confirm` (primary/save)
  - `.tab-modal-cancel` (cancel/close)
- Additional variations may be created, such as `.tab-modal-neutral`, if needed.

**Example in HTML/JS:**
```html
<div class="tab-modal-overlay">
  <div class="tab-modal-content">
    <h2 class="tab-modal-title">Title</h2>
    <div class="tab-modal-body">...</div>
    <div class="tab-modal-buttons">
      <button class="tab-modal-btn tab-modal-confirm">Save</button>
      <button class="tab-modal-btn tab-modal-cancel">Cancel</button>
    </div>
  </div>
</div>
```

---

## 3. **Inputs and Text Fields**

- Textareas in modals must use `.tab-modal-textarea`.
- Inputs in the tag editor must use `.tag-input`.
- If you need similar, reusable fields, create new input classes accordingly.

---

## 4. **Tags & Badges**

- Tag badges must use `.tag-badge`.
- Tag lists and tag containers use `.tag-container`, `.tag-section`, etc.

---

## 5. **Tabulator Footer Buttons**

- Buttons in Tabulator footers must use `.tab-modal-btn tab-modal-confirm` to match modal buttons.

---

## 6. **Responsiveness**

- Modal and button styling is already responsive in `custom.css`.
- If more mobile adaptation is needed, use media queries in the same file.

---

## 7. **Extending**

- For new UI components:  
  1. Always start from existing class names and structure.
  2. Add new classes in `custom.css` following the same naming conventions.
  3. Document changes directly in this STYLEGUIDE.

---

## 8. **Reference**

- All updates and extensions must be made in:  
  [`custom.css`](custom.css)

---

## 9. **Example: Reusable Button in JavaScript**
```js
const btn = document.createElement("button");
btn.className = "tab-modal-btn tab-modal-confirm";
```
---

## 10. **Other**

- If unsure – check `custom.css` before creating new classes.
- Avoid duplicates and overlapping CSS.

---

**Last updated:** 2025-09-01
