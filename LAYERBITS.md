# 📘 **LAYERBITS — Developer Documentation**

A Chrome extension that lets users inspect live websites visually, extract clean CSS, translate styles to Tailwind CSS, copy HTML/JSX, lock elements, and use a custom right-click menu for advanced inspection features.

This document explains **the architecture**, **each feature**, and **how to extend or modify the system**.

---

# 🧱 **1. Architecture Overview**

Layerbits is made of 4 main components:

### ✔ **1. `manifest.json`**
Declares permissions, content scripts, extension UI, and assets.

### ✔ **2. Popup (`popup.html`, `popup.js`, `popup.css`)**
Used to toggle the inspector on/off.

### ✔ **3. Content Script (`contentScript.js`)**
Injected into all web pages.
This is where **all inspection logic** lives.

### ✔ **4. Styles (`contentStyles.css`)**
Custom UI styles for:
- Inspector panel  
- Highlight box  
- Tooltip  
- Right-click menu  
- Tabs  
- Code output  

---

# 📐 **2. Core Features**

## ❤️ **A. Live Element Inspector**

### 🔍 How it works
When enabled:

- The user moves their cursor over page elements
- Layerbits highlights the element using a `div#layerbits-highlight-box`
- A tooltip follows the cursor and shows the element’s CSS selector
- The right panel shows:
  - CSS tab
  - Tailwind tab
  - HTML tab
  - JSX tab

### ✨ Panels update automatically on hover (unless locked)

### 🧪 Highlights track:
- Mouseover  
- Scroll position  
- Resize  
- Lock mode  

---

# 📌 **B. CSS Extraction**

### ✔ Extracts computed styles using:
```js
window.getComputedStyle(target);
```

### ✔ Only meaningful CSS is included:
- layout  
- spacing  
- typography  
- colors  
- borders  
- effects  

### ✔ Color values are automatically converted to the selected mode:
- HEX  
- RGB  
- RGBA  
- HSL  
- HSLA  

### ✔ Color swatches appear next to color values

### 📌 Example:
```css
{
  color: #1a1a1a;
  background-color: #ffffff;
  font-size: 16px;
  justify-content: center;
}
```

---

# 🎨 **C. Tailwind CSS Generator**

Layerbits dynamically maps computed CSS → Tailwind utility classes.

Includes logic for:

### 👉 Layout
- `flex`, `inline-flex`, `grid`
- `flex-row`, `flex-col`, etc.
- `justify-*`
- `items-*`

### 👉 Spacing
- Margin: `m-*`, `mt-*`, etc.
- Padding: `p-*`, `pt-*`, etc.
- Gap: `gap-*`, `gap-x-*`, `gap-y-*`

### 👉 Grid
- `grid-cols-*`
- `grid-rows-*`
(based on `grid-template-columns`/rows)

### 👉 Size
- `w-*`, `h-*`, `max-w-*`
- Fallback to bracket notation when not divisible by the Tailwind spacing scale.

### 👉 Typography
- `font-*`
- `text-*`
- `leading-*`

### 👉 Borders & Radius
- `rounded`, `rounded-md`, etc.

### 👉 Colors
Converted to selected color mode and wrapped:

```
text-[#1a1a1a]
bg-[rgb(10,20,30)]
```

### 👉 Shadows
Converts most shadows → `shadow`

---

# 🧩 **D. HTML & JSX Exporter**

### 📄 **HTML Tab**
Shows the element’s outer HTML.

### ⚛ **JSX Tab**
Converts:
- `class=` → `className=`
- `for=` → `htmlFor=`
- Void elements closed like `<img />`
- Wraps everything in:
```jsx
function Component() {
  return (
    <>
      ...
    </>
  );
}
```

---

# 💬 **E. Custom Right-Click Menu**

Layerbits **overrides the browser right-click** inside web pages while inspector is active.

### Right-clicking an element shows Layerbits’ menu:

### **Right-Click Menu Options**
#### ✔ **Lock element**  
Locks inspection on this element.

#### ✔ **Color value mode**  
Choose how extracted colors are displayed:
- HEX  
- RGB  
- RGBA  
- HSL  
- HSLA  

#### 🧠 Why?
Changes both **CSS extraction** and **Tailwind color values**.

### 🧼 Clicking outside closes the menu  
Clicking inside does **not** close it.

---

# 🔒 **F. Lock Element Mechanism**

Locking preserves:
- highlight box  
- tooltip  
- CSS extraction  
- Tailwind output  
- HTML/JSX output  

Even when:
- Moving mouse
- Scrolling
- Hovering other elements

### Lock states sync between:
- Panel “Lock” button
- Right-click menu checkbox

---

# 🧰 **G. Settings Panel**

Inside the Layerbits panel, there is a settings button (⚙).

### Settings include:

### ✔ Panel Size
- Small (default)
- Medium
- Large

Stored via:
```js
chrome.storage.sync.set({ layerbitsPanelSize: "medium" });
```

---

# 🖼 **H. Highlight Box + Tooltip**

### Highlight Box
Outlined green box that follows the hovered element’s actual bounding box.

### Tooltip
Shows:
- CSS selector  
- Follows cursor with small offset  

Both elements:
- Ignore mouse events (`isOurElement()` logic)
- Always stay on top (`z-index`)

---

# 🪟 **I. Popup Toggle**

The popup UI toggles the inspector script via:
```js
chrome.tabs.sendMessage(tab.id, {
  type: "LAYERBITS_TOGGLE",
  enabled: true or false
});
```

The content script listens for this message and:
- Shows or hides the panel
- Enables or disables element inspection
- Removes highlight + menu when disabled

Stored persistently with:

```js
chrome.storage.sync.set({ layerbitsEnabled: true });
```

---

# 🚦 **3. Initialization Flow**

### On page load:

1. Load saved settings:
   - inspector enabled state
   - color mode
   - panel size

2. Inject UI elements:
   - panel
   - highlight box
   - tooltip
   - custom right-click menu

3. Register events:
   - mouseover / mouseout
   - click
   - contextmenu
   - scroll / resize
   - keydown (ESC)
   - messages from popup

4. Inspector starts active (unless disabled)

---

# 🧪 **4. Event Lifecycle**

### **Mouseover**
- If not locked → update panel + highlight + tooltip

### **Click**
- Select the clicked element
- Lock if chosen

### **Contextmenu**
- Prevents default browser menu
- Shows custom Layerbits menu at cursor

### **Mousedown**
- Hides menu (unless clicking inside menu)

### **Scroll + Resize**
- Recalculates highlight box for locked element

### **ESC**
- Hides menu

---

# 🗂 **5. File Structure Suggested**

```
layerbits/
│
├── LAYERBITS.md
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
│
├── scripts/
│   └── contentScript.js
│
├── styles/
│   └── contentStyles.css
│
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

# 🛠 **6. Adding New Features**

## ✔ Add more Tailwind mappings  
Modify mapping functions in `contentScript.js`.

## ✔ Add new right-click options  
Modify menu HTML + handlers.

## ✔ Add more inspector tabs  
Add tab UI + extractor logic.

## ✔ Add Figma Compare Mode (future)

---

# 📦 **7. Known Limitations / Future Improvements**

- No pseudo-elements
- No multi-element export
- No full Figma integration yet

---

# 🎉 **Layerbits Documentation Complete**
