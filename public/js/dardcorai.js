document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.innerHTML = `
        .terminal-code { overflow-x: auto; scrollbar-width: thin; scrollbar-color: #4b5563 transparent; }
        .terminal-code::-webkit-scrollbar { height: 2px !important; width: 2px !important; background: transparent !important; display: block !important; }
        .terminal-code::-webkit-scrollbar-track { background: transparent !important; }
        .terminal-code::-webkit-scrollbar-thumb { background-color: #4b5563 !important; border-radius: 2px !important; }
        .hljs { color: #e2e8f0 !important; background: transparent !important; }
        .hljs-keyword, .hljs-selector-tag, .hljs-built_in, .hljs-name, .hljs-tag { color: #a855f7 !important; font-weight: bold; text-shadow: 0 0 5px rgba(168, 85, 247, 0.3); }
        .hljs-string, .hljs-title, .hljs-section, .hljs-attribute, .hljs-literal, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-addition { color: #22c55e !important; }
        .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: #3b82f6 !important; font-style: italic; }
        .hljs-number, .hljs-regexp, .hljs-symbol, .hljs-bullet, .hljs-link { color: #eab308 !important; }
        .hljs-function, .hljs-title.function_ { color: #3b82f6 !important; }
        .hljs-variable { color: #eab308 !important; }
        
        details.unified-header { width: fit-content; margin-bottom: 6px; display: block; border: none !important; background: transparent !important; outline: none !important; box-shadow: none !important; }
        details.unified-header > summary { list-style: none; display: flex; align-items: center; width: fit-content; outline: none !important; cursor: pointer; border: none !important; background: transparent !important; padding: 0; margin: 0; }
        details.unified-header > summary::-webkit-details-marker { display: none; }

        .header-content-wrapper { display: flex; align-items: center; gap: 10px; padding: 4px 0; opacity: 0.95; transition: opacity 0.2s; user-select: none; white-space: nowrap; background: transparent !important; border: none !important; box-shadow: none !important; }
        .header-content-wrapper:hover { opacity: 1; }
        .header-content-wrapper.static-mode { cursor: default; }
        
        .logo-stack { position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .main-logo { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; position: relative; z-index: 2; box-shadow: 0 0 10px rgba(168, 85, 247, 0.4); }
        .spinner-ring { position: absolute; inset: -3px; border: 2px solid transparent; border-top-color: #a855f7; border-right-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite; z-index: 1; opacity: 0; transition: opacity 0.3s; }
        .spinner-ring.active { opacity: 1; }
        
        .bot-name-display { font-size: 13px; font-weight: 700; color: #e9d5ff; letter-spacing: 0.5px; text-shadow: 0 0 10px rgba(168, 85, 247, 0.3); }
        .toggle-chevron { font-size: 10px; color: #a78bfa; transition: transform 0.3s ease; opacity: 0.8; margin-left: 2px; flex-shrink: 0; display: inline-block; }
        details[open] .toggle-chevron { transform: rotate(180deg); }
        
        .terminal-wrapper-outer { position: relative; width: 100%; overflow: hidden; margin: 10px 0; border-radius: 6px; z-index: 1; display: block; }
        .terminal-wrapper-inner { position: relative; width: 100%; overflow: hidden; display: block; }

        .vscode-view-trigger { display: none; width: 100%; padding: 20px; background: #1e1e1e; border: 1px solid #a855f7; border-radius: 6px; flex-direction: column; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; box-shadow: 0 4px 15px rgba(88, 28, 135, 0.2); }
        .vscode-view-trigger:hover { background: #252526; border-color: #d8b4fe; transform: translateY(-1px); }
        
        .btn-vscode-action { width: 100%; padding: 12px; background: #581c87; color: white; border-radius: 4px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; }
        .btn-vscode-action:hover { background: #6b21a8; }
        
        .btn-vscode-peek { background: transparent; color: #a855f7; font-size: 11px; margin-top: 5px; cursor: pointer; border: none; text-decoration: underline; }

        body.vscode-active .standard-view { display: none !important; }
        body.vscode-active .vscode-view-trigger { display: flex !important; }

        header button.p-2.rounded-lg { background: transparent !important; box-shadow: none !important; border: none !important; }
        header button.p-2.rounded-lg:hover { background: rgba(255,255,255,0.05) !important; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit-1 { 0% { transform: rotate3d(1, 1, 1, 0deg); } 100% { transform: rotate3d(1, 1, 1, 360deg); } }
        @keyframes orbit-2 { 0% { transform: rotate3d(1, -1, 1, 0deg); } 100% { transform: rotate3d(1, -1, 1, 360deg); } }
        @keyframes orbit-3 { 0% { transform: rotate3d(-1, 1, 1, 0deg); } 100% { transform: rotate3d(-1, 1, 1, 360deg); } }
        @keyframes orbit-4 { 0% { transform: rotate3d(1, 1, -1, 0deg); } 100% { transform: rotate3d(1, 1, -1, 360deg); } }
        @keyframes orbit-5 { 0% { transform: rotate3d(0, 1, 1, 0deg); } 100% { transform: rotate3d(0, 1, 1, 360deg); } }
        @keyframes orbit-6 { 0% { transform: rotate3d(1, 0, 0, 0deg); } 100% { transform: rotate3d(1, 0, 0, 360deg); } }
        
        .animate-orbit-1 { animation: orbit-1 6s linear infinite; }
        .animate-orbit-2 { animation: orbit-2 7s linear infinite; }
        .animate-orbit-3 { animation: orbit-3 8s linear infinite; }
        .animate-orbit-4 { animation: orbit-4 9s linear infinite; }
        .animate-orbit-5 { animation: orbit-5 10s linear infinite; }
        .animate-orbit-6 { animation: orbit-6 11s linear infinite; }
        
        .editor-header { height: 35px; background: #0a0a12; display: flex; align-items: center; padding: 0 10px; border-bottom: 1px solid #1e1e1e; flex-shrink: 0; width: 100%; }
        .editor-tab { background: #050508; color: #fff; padding: 5px 15px; font-size: 12px; border-top: 1px solid #a855f7; display: flex; align-items: center; gap: 8px; cursor: pointer; height: 100%; border-right: 1px solid #1e1e1e; }
        .editor-body { flex: 1; display: flex; overflow: hidden; height: calc(100% - 35px); width: 100%; }
        .editor-sidebar { width: 200px; background: #0a0a12; border-right: 1px solid #1e1e1e; display: flex; flex-direction: column; }
        .editor-files { flex: 1; overflow-y: auto; padding: 5px; color: #ccc; font-size: 12px; }
        .file-item { padding: 4px 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; border-radius: 3px; user-select: none; }
        .file-item:hover { background: #1e1e1e; }
        .file-item.active { background: #2d2d2d; color: #fff; }
        .folder-item { padding: 4px 8px; font-weight: bold; color: #a855f7; display: flex; align-items: center; gap: 6px; margin-top: 5px; cursor: context-menu; user-select: none; }
        .editor-actions { padding: 8px; border-top: 1px solid #1e1e1e; display: flex; gap: 5px; }
        .action-btn { flex: 1; background: #1e1e1e; border: 1px solid #333; color: #ccc; font-size: 10px; padding: 4px; border-radius: 3px; cursor: pointer; text-align: center; }
        .action-btn:hover { background: #333; color: white; }
        .editor-content-wrapper { flex: 1; position: relative; overflow: hidden; background: #050508; }
        #monaco-container { width: 100%; height: 100%; }
        .editor-ctrl-btn { color: #ccccc7; cursor: pointer; padding: 5px 8px; border-radius: 4px; display: flex; align-items: center; gap: 5px; font-size: 12px; }
        .editor-ctrl-btn:hover { background: #333; color: white; }
        .btn-run { color: #4ade80 !important; font-weight: bold; margin-right: 10px; }
        .btn-run:hover { background: #064e3b !important; }

        .editor-popup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
        .editor-popup { background: #1e1e1e; border: 1px solid #333; border-radius: 8px; width: 300px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); overflow: hidden; animation: popupIn 0.2s ease-out; }
        .editor-popup-header { background: #252526; padding: 10px 15px; font-size: 13px; font-weight: bold; color: #ccc; border-bottom: 1px solid #333; }
        .editor-popup-body { padding: 15px; }
        .editor-popup-input { width: 100%; background: #0a0a12; border: 1px solid #333; color: #fff; padding: 8px; font-size: 13px; border-radius: 4px; outline: none; }
        .editor-popup-input:focus { border-color: #a855f7; }
        .editor-popup-footer { padding: 10px 15px; background: #252526; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #333; }
        .editor-popup-btn { padding: 6px 12px; font-size: 12px; border-radius: 4px; cursor: pointer; border: none; font-weight: 500; }
        .btn-cancel { background: transparent; color: #ccc; }
        .btn-cancel:hover { background: #333; }
        .btn-confirm { background: #581c87; color: white; }
        .btn-confirm:hover { background: #6b21a8; }
        
        .context-menu { position: fixed; background: #252526; border: 1px solid #454545; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 50000; padding: 4px 0; min-width: 150px; }
        .context-menu-item { padding: 6px 12px; font-size: 12px; color: #cccccc; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .context-menu-item:hover { background: #094771; color: white; }
        .context-menu-item i { width: 14px; text-align: center; }
        .context-menu-separator { height: 1px; background: #454545; margin: 4px 0; }

        @keyframes popupIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        @media (max-width: 768px) {
            .editor-sidebar { width: 0; display: none; }
            .editor-sidebar.active { width: 150px; display: flex; position: absolute; z-index: 10; height: 100%; }
        }
    `;
    document.head.appendChild(style);

    const savedSidebarState = localStorage.getItem('dardcor_sidebar_state');
    if (savedSidebarState === 'closed') {
        document.body.classList.add('sidebar-closed');
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth < 1024) sidebar.classList.add('-translate-x-full');
    } else {
        document.body.classList.remove('sidebar-closed');
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth < 1024) sidebar.classList.add('-translate-x-full'); 
    }

    const savedEditorState = localStorage.getItem('dardcor_editor_state');
    
    const sidebarItems = document.querySelectorAll('.chat-item *, .static-new-chat-item *');
    sidebarItems.forEach(el => {
        if (window.getComputedStyle(el).pointerEvents === 'none') {
            el.style.pointerEvents = 'auto';
            el.classList.remove('pointer-events-none');
        }
    });

    const serverData = window.SERVER_DATA || {};
    let currentToolType = 'basic';
    let currentUtterance = null;
    let chatToEdit = null;
    let chatToDelete = null;
    let selectedFiles = [];
    let isSending = false;
    let abortController = null;
    let isChatLoading = false;
    let userIsScrolling = false;
    let loadingTimeout = null;
    let isSearchEnabled = false;
    let recognition = null;
    let isEditorOpen = false;
    let monacoEditorInstance = null;
    let isMonacoLoaded = false;
    let fileSystem = {
        'root': { type: 'folder', name: 'Project', children: {} }
    };
    let currentFile = null;
    let saveTimeout = null;
    let contextMenuTarget = null;

    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const messageList = document.getElementById('message-list');
    const fileInput = document.getElementById('file-upload');
    const fileUploadBtn = document.getElementById('file-upload-btn');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const dropZone = document.getElementById('drop-zone');
    const sendBtn = document.getElementById('send-btn');
    const sendIcon = document.getElementById('send-icon');
    const micBtn = document.getElementById('mic-btn');
    const searchBtn = document.getElementById('search-btn');
    const vscodeBtn = document.getElementById('vscode-btn');

    function checkAuth(response) {
        if (response.status === 401) {
            window.location.reload();
            return false;
        }
        return true;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function parseMessageContent(text) {
        if (!text) return { answer: '' };
        const safeText = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
        const cleanText = safeText.replace(thinkRegex, '').replace('<think>', '').replace('</think>', '').trim();
        return { answer: cleanText };
    }

    function loadMonacoScript() {
        return new Promise((resolve, reject) => {
            if (window.monaco) { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Monaco loader'));
            document.head.appendChild(script);
        });
    }

    function detectLanguage(filename) {
        if (!filename) return 'plaintext';
        const ext = filename.split('.').pop().toLowerCase();
        const map = {
            'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
            'html': 'html', 'htm': 'html', 'css': 'css', 'scss': 'css', 'less': 'css', 'sass': 'css',
            'json': 'json', 'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c',
            'cs': 'csharp', 'php': 'php', 'sql': 'sql', 'md': 'markdown', 'xml': 'xml',
            'yaml': 'yaml', 'yml': 'yaml', 'sh': 'shell', 'bash': 'shell', 'rb': 'ruby',
            'go': 'go', 'rs': 'rust', 'lua': 'lua', 'ejs': 'html'
        };
        return map[ext] || 'plaintext';
    }

    async function fetchProjectFiles() {
        try {
            const res = await fetch('/api/project/files');
            if (!checkAuth(res)) return;
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.files) {
                    fileSystem.root.children = {};
                    data.files.forEach(f => {
                        const pathParts = f.path === 'root' ? [] : f.path.split('/');
                        let current = fileSystem.root;
                        
                        pathParts.forEach(part => {
                            if (!current.children[part]) {
                                current.children[part] = { type: 'folder', name: part, children: {} };
                            }
                            current = current.children[part];
                        });

                        fileSystem.root.children[f.name] = { 
                            type: f.is_folder ? 'folder' : 'file', 
                            content: f.content,
                            language: f.language || detectLanguage(f.name),
                            name: f.name
                        };
                    });
                    renderFileTree();
                    
                    if (!currentFile && Object.keys(fileSystem.root.children).length > 0) {
                        const firstFile = Object.keys(fileSystem.root.children)[0];
                        if (fileSystem.root.children[firstFile].type === 'file') {
                            openFile(firstFile, fileSystem.root.children[firstFile].content);
                        }
                    }
                }
            }
        } catch (e) {}
    }

    async function saveFileToCloud(filename, content, oldName = null) {
        if (!filename) return;
        try {
            if (oldName) {
                const delRes = await fetch('/api/project/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: oldName, path: 'root' })
                });
                if (!checkAuth(delRes)) return;
            }

            const saveRes = await fetch('/api/project/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: filename,
                    content: content,
                    language: detectLanguage(filename),
                    is_folder: false,
                    path: 'root'
                })
            });
            if (!checkAuth(saveRes)) return;

            const tabName = document.getElementById('active-file-name');
            if (tabName && currentFile === filename) {
                const originalText = tabName.innerText;
                tabName.innerHTML = `${escapeHtml(filename)} <span class="text-green-500 text-[10px] ml-2">(Saved)</span>`;
                setTimeout(() => { tabName.innerText = filename; }, 2000);
            }
        } catch (e) {}
    }

    async function deleteFileFromCloud(filename) {
        try {
            const res = await fetch('/api/project/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: filename, path: 'root' })
            });
            checkAuth(res);
        } catch (e) {}
    }

    function createContextMenu() {
        const existing = document.getElementById('editor-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'editor-context-menu';
        menu.className = 'context-menu hidden';
        document.body.appendChild(menu);

        document.addEventListener('click', () => {
            menu.classList.add('hidden');
        });

        menu.addEventListener('click', (e) => e.stopPropagation());
    }

    function showContextMenu(e, name, type) {
        e.preventDefault();
        const menu = document.getElementById('editor-context-menu');
        if (!menu) return;

        contextMenuTarget = { name, type };
        const safeName = escapeHtml(name);
        
        menu.innerHTML = `
            <div class="context-menu-item" onclick="window.renameItem('${safeName}')">
                <i class="fas fa-edit"></i> Rename
            </div>
            <div class="context-menu-item" style="color: #ef4444;" onclick="window.deleteItem('${safeName}')">
                <i class="fas fa-trash"></i> Delete
            </div>
        `;

        const x = e.clientX;
        const y = e.clientY;
        
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.remove('hidden');
    }

    function renderFileTree() {
        const container = document.getElementById('file-tree-container');
        if (!container) return;
        container.innerHTML = '';
        
        function traverse(node, path, containerEl) {
            const sortedKeys = Object.keys(node).sort((a, b) => {
                const typeA = node[a].type;
                const typeB = node[b].type;
                if (typeA === typeB) return a.localeCompare(b);
                return typeA === 'folder' ? -1 : 1;
            });

            for (const key of sortedKeys) {
                const item = node[key];
                const itemEl = document.createElement('div');
                const safeKey = escapeHtml(key);
                
                if (item.type === 'folder') {
                    itemEl.className = 'folder-item';
                    itemEl.innerHTML = `<i class="fas fa-folder"></i> ${safeKey}`;
                    itemEl.oncontextmenu = (e) => showContextMenu(e, key, 'folder');
                    
                    const childContainer = document.createElement('div');
                    childContainer.style.paddingLeft = '15px';
                    traverse(item.children, path + '/' + key, childContainer);
                    containerEl.appendChild(itemEl);
                    containerEl.appendChild(childContainer);
                } else {
                    itemEl.className = `file-item ${currentFile === key ? 'active' : ''}`;
                    const iconClass = getFileIconClass(null, key);
                    itemEl.innerHTML = `<i class="fas ${iconClass}"></i> ${safeKey}`;
                    itemEl.onclick = () => openFile(key, item.content);
                    itemEl.oncontextmenu = (e) => showContextMenu(e, key, 'file');
                    containerEl.appendChild(itemEl);
                }
            }
        }
        traverse(fileSystem.root.children, '', container);
    }

    function openFile(filename, content) {
        currentFile = filename;
        if (monacoEditorInstance) {
            const lang = detectLanguage(filename);
            monaco.editor.setModelLanguage(monacoEditorInstance.getModel(), lang);
            monacoEditorInstance.setValue(content || '');
        }
        renderFileTree();
        const tabName = document.getElementById('active-file-name');
        if (tabName) tabName.innerText = filename;
    }

    function showPopup(title, placeholder, defaultValue = '', onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'editor-popup-overlay';
        
        const popup = document.createElement('div');
        popup.className = 'editor-popup';
        
        popup.innerHTML = `
            <div class="editor-popup-header">${escapeHtml(title)}</div>
            <div class="editor-popup-body">
                <input type="text" class="editor-popup-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}">
            </div>
            <div class="editor-popup-footer">
                <button class="editor-popup-btn btn-cancel">Cancel</button>
                <button class="editor-popup-btn btn-confirm">OK</button>
            </div>
        `;

        const input = popup.querySelector('input');
        const cancelBtn = popup.querySelector('.btn-cancel');
        const confirmBtn = popup.querySelector('.btn-confirm');

        function close() {
            overlay.remove();
        }

        function confirm() {
            const val = input.value.trim();
            if (val) {
                onConfirm(val);
                close();
            }
        }

        cancelBtn.onclick = close;
        confirmBtn.onclick = confirm;
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') close();
        };

        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        setTimeout(() => input.focus(), 50);
    }

    function showConfirmPopup(title, message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'editor-popup-overlay';
        
        const popup = document.createElement('div');
        popup.className = 'editor-popup';
        
        popup.innerHTML = `
            <div class="editor-popup-header" style="color: #ef4444;">${escapeHtml(title)}</div>
            <div class="editor-popup-body">
                <p style="color: #ccc; font-size: 13px;">${escapeHtml(message)}</p>
            </div>
            <div class="editor-popup-footer">
                <button class="editor-popup-btn btn-cancel">Cancel</button>
                <button class="editor-popup-btn btn-confirm" style="background: #ef4444;">Delete</button>
            </div>
        `;

        const cancelBtn = popup.querySelector('.btn-cancel');
        const confirmBtn = popup.querySelector('.btn-confirm');

        function close() {
            overlay.remove();
        }

        cancelBtn.onclick = close;
        confirmBtn.onclick = () => {
            onConfirm();
            close();
        };

        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    }

    window.createNewFile = function() {
        showPopup('New File', 'e.g., index.html, script.js', '', (name) => {
            if (!fileSystem.root.children[name]) {
                const content = name.endsWith('.html') ? '<!DOCTYPE html>\n<html>\n<head>\n\t<title>App</title>\n</head>\n<body>\n\t<h1>Hello World</h1>\n</body>\n</html>' : '// New File';
                fileSystem.root.children[name] = { type: 'file', content: content, language: detectLanguage(name) };
                renderFileTree();
                openFile(name, content);
                saveFileToCloud(name, content);
            } else {
                window.showNavbarAlert('File already exists', 'error');
            }
        });
    };

    window.createNewFolder = function() {
        showPopup('New Folder', 'Folder Name', '', (name) => {
            if (!fileSystem.root.children[name]) {
                fileSystem.root.children[name] = { type: 'folder', name: name, children: {} };
                renderFileTree();
            } else {
                window.showNavbarAlert('Folder already exists', 'error');
            }
        });
    };

    window.renameItem = function(oldName) {
        const item = fileSystem.root.children[oldName];
        if (!item) return;
        
        const menu = document.getElementById('editor-context-menu');
        if (menu) menu.classList.add('hidden');

        showPopup('Rename', 'New Name', oldName, (newName) => {
            if (newName !== oldName && !fileSystem.root.children[newName]) {
                const content = item.content;
                fileSystem.root.children[newName] = item;
                delete fileSystem.root.children[oldName];
                
                if (item.type === 'file') {
                    item.language = detectLanguage(newName);
                    if (currentFile === oldName) {
                        openFile(newName, content);
                    }
                    saveFileToCloud(newName, content, oldName);
                }
                renderFileTree();
            }
        });
    };

    window.deleteItem = function(name) {
        const menu = document.getElementById('editor-context-menu');
        if (menu) menu.classList.add('hidden');

        showConfirmPopup('Delete Item', `Are you sure you want to delete "${name}"?`, () => {
            delete fileSystem.root.children[name];
            deleteFileFromCloud(name);
            if (currentFile === name) {
                currentFile = null;
                if (monacoEditorInstance) monacoEditorInstance.setValue('');
                const tabName = document.getElementById('active-file-name');
                if (tabName) tabName.innerText = 'No File';
            }
            renderFileTree();
        });
    };

    async function runCodeInEditor() {
        if (!monacoEditorInstance) return;
        
        let codeToRun = '';
        let type = 'website';
        let isMermaid = false;

        const rootFiles = fileSystem.root.children;
        const indexHtml = rootFiles['index.html'];

        if (indexHtml && indexHtml.type === 'file') {
            let htmlContent = indexHtml.content;
            
            htmlContent = htmlContent.replace(/<link\s+rel=["']stylesheet["']\s+href=["'](.*?)["']\s*\/?>/g, (match, href) => {
                const cssFile = rootFiles[href];
                if (cssFile && cssFile.type === 'file') {
                    return `<style>${cssFile.content}</style>`;
                }
                return match;
            });

            htmlContent = htmlContent.replace(/<script\s+src=["'](.*?)["']\s*><\/script>/g, (match, src) => {
                const jsFile = rootFiles[src];
                if (jsFile && jsFile.type === 'file') {
                    return `<script>${jsFile.content}</script>`;
                }
                return match;
            });

            codeToRun = htmlContent;
        } else {
            codeToRun = monacoEditorInstance.getValue();
            if (currentFile && (currentFile.endsWith('.mmd') || currentFile.endsWith('.mermaid'))) {
                isMermaid = true;
                type = 'mermaid';
            } else if (codeToRun.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph)/i)) {
                isMermaid = true;
                type = 'mermaid';
            }
        }

        if (!codeToRun.trim()) return;

        const runBtn = document.getElementById('run-code-btn');
        const originalIcon = runBtn.innerHTML;
        runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const response = await fetch('/dardcorchat/ai/store-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeToRun, type: type })
            });
            
            if (!checkAuth(response)) return;

            const data = await response.json();
            
            if (data.success) {
                const overlay = document.getElementById('diagram-overlay');
                const frame = document.getElementById('diagram-frame');
                
                if (isMermaid) {
                     frame.src = `/dardcorchat/dardcor-ai/diagram/${data.previewId}`;
                } else {
                     frame.src = `/dardcorchat/dardcor-ai/preview/${data.previewId}`;
                }
                
                overlay.classList.remove('hidden');
            } else {
                window.showNavbarAlert('Gagal memproses preview', 'error');
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Error sistem preview', 'error');
        } finally {
            runBtn.innerHTML = originalIcon;
        }
    }

    async function initCodeEditor() {
        const wrapper = document.getElementById('editor-wrapper');
        if (!wrapper) return;
        
        if (!wrapper.querySelector('.editor-body')) {
            wrapper.innerHTML = `
                <div class="editor-header">
                    <div class="editor-tab"><i class="fas fa-file-code text-yellow-400"></i> <span id="active-file-name" class="ml-2 text-gray-300">No File</span></div>
                    <div style="flex: 1;"></div>
                    <div id="run-code-btn" class="editor-ctrl-btn btn-run" onclick="window.runCodeInternal()"><i class="fas fa-play"></i> Run</div>
                    <div class="editor-close-btn editor-ctrl-btn" onclick="window.toggleCodeEditor()"><i class="fas fa-times"></i></div>
                </div>
                <div class="editor-body">
                    <div class="editor-sidebar">
                        <div id="file-tree-container" class="editor-files"></div>
                        <div class="editor-actions">
                            <div class="action-btn" onclick="window.createNewFile()"><i class="fas fa-plus"></i> File</div>
                            <div class="action-btn" onclick="window.createNewFolder()"><i class="fas fa-folder-plus"></i> Folder</div>
                        </div>
                    </div>
                    <div class="editor-content-wrapper">
                        <div id="monaco-container"></div>
                    </div>
                </div>
            `;
            createContextMenu();
        }

        window.runCodeInternal = runCodeInEditor;

        if (!isMonacoLoaded) {
            try {
                await loadMonacoScript();
                isMonacoLoaded = true;
                require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
                require(['vs/editor/editor.main'], function() {
                    monaco.editor.defineTheme('dardcor-dark', {
                        base: 'vs-dark',
                        inherit: true,
                        rules: [{ background: '050508' }],
                        colors: {
                            'editor.background': '#050508',
                            'editor.lineHighlightBackground': '#10101a',
                            'editorCursor.foreground': '#a855f7',
                            'editor.selectionBackground': '#581c8740',
                            'editorLineNumber.foreground': '#4b5563'
                        }
                    });

                    monacoEditorInstance = monaco.editor.create(document.getElementById('monaco-container'), {
                        value: '',
                        language: 'plaintext',
                        theme: 'dardcor-dark',
                        automaticLayout: true,
                        minimap: { enabled: true },
                        fontSize: 13,
                        fontFamily: "'Consolas', 'Monaco', monospace"
                    });
                    
                    monacoEditorInstance.onDidChangeModelContent(() => {
                        if (currentFile && fileSystem.root.children[currentFile]) {
                            const val = monacoEditorInstance.getValue();
                            fileSystem.root.children[currentFile].content = val;
                            
                            if (saveTimeout) clearTimeout(saveTimeout);
                            saveTimeout = setTimeout(() => {
                                saveFileToCloud(currentFile, val);
                            }, 2000);
                        }
                    });

                    monacoEditorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, function() {
                        if (currentFile) {
                            saveFileToCloud(currentFile, monacoEditorInstance.getValue());
                        }
                    });
                    
                    fetchProjectFiles();
                });
            } catch (e) {
                console.error("Gagal memuat Monaco Editor", e);
            }
        } else {
            fetchProjectFiles();
        }
    }

    window.toggleCodeEditor = function() {
        document.body.classList.toggle('vscode-active');
        const isActive = document.body.classList.contains('vscode-active');
        isEditorOpen = isActive;
        localStorage.setItem('dardcor_editor_state', isActive ? 'open' : 'closed');

        if (vscodeBtn) {
            if (isActive) {
                vscodeBtn.classList.remove('bg-purple-900/10', 'text-purple-400');
                vscodeBtn.classList.add('bg-purple-600', 'text-white', 'shadow-[0_0_15px_rgba(147,51,234,0.5)]');
            } else {
                vscodeBtn.classList.add('bg-purple-900/10', 'text-purple-400');
                vscodeBtn.classList.remove('bg-purple-600', 'text-white', 'shadow-[0_0_15px_rgba(147,51,234,0.5)]');
            }
        }

        if (isActive) {
            initCodeEditor();
            setTimeout(() => { if (monacoEditorInstance) monacoEditorInstance.layout(); }, 350);
        }
    };

    function getLanguageExtension(lang) {
        const map = {
            'javascript': 'js', 'python': 'py', 'html': 'html', 'css': 'css', 'php': 'php', 
            'java': 'java', 'c': 'c', 'cpp': 'cpp', 'sql': 'sql', 'json': 'json', 'typescript': 'ts'
        };
        return map[lang.toLowerCase()] || 'txt';
    }

    window.sendToVSCode = function(btn) {
        const encodedCode = btn.getAttribute('data-code');
        const lang = btn.getAttribute('data-lang') || 'javascript';
        if (encodedCode) {
            try {
                const code = decodeURIComponent(encodedCode);
                const ext = getLanguageExtension(lang);
                const newFileName = `ai_generated_${Date.now()}.${ext}`;

                if (!monacoEditorInstance) {
                    initCodeEditor().then(() => {
                        const checkInterval = setInterval(() => {
                            if (monacoEditorInstance) {
                                clearInterval(checkInterval);
                                fileSystem.root.children[newFileName] = { type: 'file', content: code, language: detectLanguage(newFileName) };
                                openFile(newFileName, code);
                                saveFileToCloud(newFileName, code);
                                if (!isEditorOpen) window.toggleCodeEditor();
                            }
                        }, 100);
                    });
                } else {
                    fileSystem.root.children[newFileName] = { type: 'file', content: code, language: detectLanguage(newFileName) };
                    openFile(newFileName, code);
                    saveFileToCloud(newFileName, code);
                    if (!isEditorOpen) window.toggleCodeEditor();
                }
            } catch (e) {}
        }
    };

    if (savedEditorState === 'open') {
        window.toggleCodeEditor();
    }

    if (vscodeBtn) {
        vscodeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.toggleCodeEditor();
        });
    }

    function injectEditButtonsOnLoad() {
        const userBubbles = document.querySelectorAll('.message-bubble-container');
        userBubbles.forEach(container => {
            if (container.classList.contains('justify-end')) {
                let actionDiv = container.querySelector('.flex.items-center.gap-3');
                if (!actionDiv) {
                    actionDiv = document.createElement('div');
                    actionDiv.className = "flex items-center gap-3 mt-1 px-1 select-none opacity-50 group-hover:opacity-100 transition-opacity";
                    const flexCol = container.querySelector('.flex.flex-col');
                    if (flexCol) flexCol.appendChild(actionDiv);
                }
                if (actionDiv) {
                    let editBtn = actionDiv.querySelector('button[title="Edit Pesan"]');
                    let copyBtn = actionDiv.querySelector('button[title="Salin Pesan"]');
                    if (!editBtn) {
                        editBtn = document.createElement('button');
                        editBtn.onclick = function() { window.editMessage(this); };
                        editBtn.className = "text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors";
                        editBtn.title = "Edit Pesan";
                        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                    }
                    if (!copyBtn) {
                        copyBtn = document.createElement('button');
                        copyBtn.onclick = function() { window.copyMessageBubble(this); };
                        copyBtn.className = "text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors";
                        copyBtn.title = "Salin Pesan";
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin';
                    }
                    actionDiv.prepend(editBtn);
                    editBtn.after(copyBtn);
                }
            }
        });
    }
    
    setTimeout(injectEditButtonsOnLoad, 100);
    setTimeout(injectEditButtonsOnLoad, 500);
    setTimeout(injectEditButtonsOnLoad, 1000);

    if (typeof marked !== 'undefined') {
        const renderer = new marked.Renderer();
        renderer.code = function(code, language) {
            let validCode = (typeof code === 'string' ? code : (code.text || ''));
            let lang = (language || '').toLowerCase().trim().split(/\s+/)[0] || 'text';
            const trimmedCode = validCode.trim();
            if (['text', 'txt', 'code', ''].includes(lang)) {
                if (trimmedCode.match(/^<!DOCTYPE html/i) || trimmedCode.match(/^<html/i) || trimmedCode.match(/<\/div>/)) lang = 'html';
                else if (trimmedCode.match(/^<\?php/i) || trimmedCode.match(/\$\w+\s*=/)) lang = 'php';
                else if (trimmedCode.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph)/i)) lang = 'mermaid';
                else if (trimmedCode.match(/^(def\s|class\s|from\s|import\s+[\w\s,]+from|print\(|if\s+__name__\s*==|elif\s|try:|except:|with\s+open)/m)) lang = 'python';
                else if (trimmedCode.match(/^(const\s|let\s|var\s|function|console\.log|=>|document\.|window\.|import\s+.*from\s+['"]|export\s)/m)) lang = 'javascript';
                else if (trimmedCode.match(/^#include/) || trimmedCode.match(/std::/)) lang = 'cpp';
                else if (trimmedCode.match(/^package main/) || trimmedCode.match(/^func main/)) lang = 'go';
                else if (trimmedCode.match(/^using System;/) || trimmedCode.match(/Console\.WriteLine/)) lang = 'csharp';
                else if (trimmedCode.match(/^public class/) || trimmedCode.match(/System\.out\.println/)) lang = 'java';
                else if (trimmedCode.match(/^\s*([.#]?-?[_a-zA-Z]+[_a-zA-Z0-9-]*|\*|:root|body|html|div|span|h[1-6]|p|a|button|input)\s*\{/) || trimmedCode.match(/(margin|padding|color|background|border|display|font|width|height|flex|grid)\s*:/)) lang = 'css';
                else if (trimmedCode.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER).*FROM/i)) lang = 'sql';
                else if (trimmedCode.match(/^\{[\s\S]*"[^"]+":/)) lang = 'json';
                else if (trimmedCode.match(/^#!/)) lang = 'bash';
            }
            
            let btnHtml = '';

            if (lang === 'html' || lang === 'php' || lang === 'ejs') {
                btnHtml = `<button onclick="window.previewCode(this)" class="cmd-btn btn-preview" title="Preview Website"><i class="fas fa-play"></i> Preview</button>`;
            } else if (lang === 'mermaid') {
                btnHtml = `<button onclick="window.previewDiagram(this)" class="cmd-btn btn-diagram" title="Preview Diagram"><i class="fas fa-project-diagram"></i> Preview Diagram</button>`;
            }
            
            const escapedCode = validCode
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            const encodedForEditor = encodeURIComponent(validCode);
            
            const terminalHtml = `
                <div class="terminal-wrapper-outer">
                    <div class="terminal-wrapper-inner">
                        <div class="standard-view">
                            <div class="terminal-container" style="background-color: #000000 !important; border: 1px solid #333; margin: 0; max-width: 100%;">
                                <div class="terminal-head" style="height: 32px; padding: 0 12px; background-color: #000000 !important; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #333;">
                                    <div class="text-[10px] font-bold text-gray-400 uppercase flex items-center"><i class="fas fa-code mr-2"></i> ${escapeHtml(lang)}</div>
                                    <div class="terminal-actions flex gap-2">
                                        ${btnHtml}
                                        <button onclick="window.copyCode(this)" class="cmd-btn btn-copy" style="font-size: 10px; padding: 2px 8px; background-color: #21262d; color: #c9d1d9;" title="Salin Kode"><i class="fas fa-copy"></i></button>
                                    </div>
                                </div>
                                <div class="terminal-code" style="background-color: #000000 !important;">
                                    <pre style="background: transparent !important; margin: 0;"><code class="hljs ${escapeHtml(lang)}" style="background: transparent !important; font-family: 'Consolas', monospace; font-size: 12px; color: #e6edf3;">${escapedCode}</code></pre>
                                    <textarea class="hidden raw-code">${escapedCode}</textarea>
                                </div>
                            </div>
                        </div>
                        
                        <div class="vscode-view-trigger">
                            <button class="btn-vscode-action" onclick="window.sendToVSCode(this)" data-code="${encodedForEditor}" data-lang="${escapeHtml(lang)}">
                                <i class="fas fa-arrow-right"></i> INSERT TO EDITOR
                            </button>
                        </div>

                    </div>
                </div>`;
            
            return terminalHtml;
        };
        
        renderer.link = function(href, title, text) {
            let u = (href || '').trim();
            try {
                new URL(u); 
            } catch(e) {
                if (!u.startsWith('/') && !u.startsWith('#')) {
                }
            }
            
            if (u.toLowerCase().startsWith('javascript:')) u = '#';

            const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
            return `<a href="${escapeHtml(u)}"${titleAttr} target="_blank" rel="noopener noreferrer" class="text-purple-500 hover:text-purple-300 hover:underline font-bold transition-colors break-all">${text}</a>`;
        };
        
        marked.setOptions({ renderer: renderer, gfm: true, breaks: true, sanitize: false });
    }

    function resetChatState() {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        isChatLoading = false;
        if (isSending && abortController) {
            abortController.abort();
            isSending = false;
            abortController = null;
            if (sendIcon) sendIcon.classList.replace('fa-stop', 'fa-paper-plane');
            const indicator = document.getElementById('loading-indicator');
            if (indicator) indicator.remove();
        }
        selectedFiles.forEach(f => {
             if (f instanceof File && f.type.startsWith('image/')) {
                 URL.revokeObjectURL(f);
             }
        });
        selectedFiles = [];
        updateFilePreviews();
        if (messageInput) { messageInput.value = ''; messageInput.style.height = 'auto'; }
    }

    const refreshBtn = document.getElementById('refresh-chat-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const icon = document.getElementById('refresh-icon');
            if (icon) icon.classList.add('fa-spin');
            setTimeout(() => window.location.reload(), 300);
        });
    }

    function getFileIconClass(mimetype, filename) {
        if (!mimetype) mimetype = "";
        if (!filename) filename = "";
        mimetype = mimetype.toLowerCase();
        filename = filename.toLowerCase();
        if (mimetype.includes('pdf')) return 'fa-file-pdf text-red-400';
        if (mimetype.includes('word') || mimetype.includes('document') || filename.endsWith('.docx') || filename.endsWith('.doc')) return 'fa-file-word text-blue-400';
        if (mimetype.includes('excel') || mimetype.includes('sheet') || mimetype.includes('csv') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) return 'fa-file-excel text-green-400';
        if (mimetype.includes('presentation') || mimetype.includes('powerpoint') || mimetype.includes('ppt') || filename.endsWith('.pptx') || filename.endsWith('.ppt')) return 'fa-file-powerpoint text-orange-400';
        if (mimetype.includes('zip') || mimetype.includes('compressed') || mimetype.includes('tar') || mimetype.includes('rar') || mimetype.includes('7z')) return 'fa-file-archive text-yellow-500';
        if (mimetype.includes('code') || mimetype.includes('javascript') || mimetype.includes('json') || filename.match(/\.(js|jsx|ts|tsx|html|css|py|php|java|cpp|c|h|json|xml|sql|ejs|rb|go|rs|swift|kt|sh|bat|pl|yml|yaml|ini|env|md)$/i)) return 'fa-file-code text-purple-400';
        if (mimetype.includes('video')) return 'fa-file-video text-pink-400';
        if (mimetype.includes('audio')) return 'fa-file-audio text-purple-400';
        if (mimetype.includes('text') || filename.endsWith('.txt')) return 'fa-file-alt text-gray-300';
        return 'fa-file text-gray-400';
    }

    function updateFilePreviews() {
        if (!filePreviewContainer) return;
        filePreviewContainer.innerHTML = '';
        if (selectedFiles.length === 0) {
            filePreviewContainer.classList.add('hidden');
            return;
        }
        filePreviewContainer.classList.remove('hidden');
        selectedFiles.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = "relative group w-16 h-16 rounded-lg overflow-hidden border border-purple-900/40 bg-[#0e0e14]";
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                const objUrl = URL.createObjectURL(file);
                img.src = objUrl;
                img.onload = () => URL.revokeObjectURL(objUrl);
                img.className = "w-full h-full object-cover";
                div.appendChild(img);
            } else {
                const iconClass = getFileIconClass(file.type, file.name);
                div.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center p-1 text-center"><i class="fas ${iconClass} text-xl mb-1"></i><span class="text-[8px] text-gray-400 truncate w-full">${escapeHtml(file.name.slice(-6))}</span></div>`;
            }
            const removeBtn = document.createElement('button');
            removeBtn.className = "absolute top-0 right-0 bg-red-600/90 text-white w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-md z-10 cursor-pointer";
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = (e) => { e.stopPropagation(); selectedFiles.splice(index, 1); updateFilePreviews(); };
            div.appendChild(removeBtn);
            filePreviewContainer.appendChild(div);
        });
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;
        if (selectedFiles.length >= 10) {
            window.showNavbarAlert('Maksimal 10 file', 'error');
            return;
        }
        const remainingSlots = 10 - selectedFiles.length;
        const toAdd = Array.from(files).slice(0, remainingSlots);
        toAdd.forEach(file => { if (file.size <= 50 * 1024 * 1024) selectedFiles.push(file); });
        updateFilePreviews();
        if (files.length > remainingSlots) {
             window.showNavbarAlert('Hanya 10 file yang diizinkan', 'info');
        }
    }

    if (fileUploadBtn && fileInput) {
        fileUploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); fileInput.value = ''; });
    }
    if (messageInput) {
        messageInput.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            const files = [];
            for (let i = 0; i < items.length; i++) if (items[i].kind === 'file') files.push(items[i].getAsFile());
            if (files.length > 0) { e.preventDefault(); handleFiles(files); }
        });
    }

    window.addEventListener('dragover', (e) => { e.preventDefault(); if (dropZone) { dropZone.classList.remove('hidden'); dropZone.classList.add('flex'); } });
    window.addEventListener('dragleave', (e) => { if (e.relatedTarget === null || e.relatedTarget === document.documentElement) { if (dropZone) { dropZone.classList.add('hidden'); dropZone.classList.remove('flex'); } } });
    window.addEventListener('drop', (e) => { e.preventDefault(); if (dropZone) { dropZone.classList.add('hidden'); dropZone.classList.remove('flex'); } handleFiles(e.dataTransfer.files); });

    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isSearchEnabled = !isSearchEnabled;
            if (isSearchEnabled) {
                searchBtn.classList.remove('bg-purple-900/10', 'text-purple-400', 'border-purple-800/30');
                searchBtn.classList.add('bg-purple-600', 'text-white', 'border-purple-400', 'shadow-[0_0_15px_rgba(147,51,234,0.5)]');
                window.showNavbarAlert('Web Search Diaktifkan', 'success');
            } else {
                searchBtn.classList.add('bg-purple-900/10', 'text-purple-400', 'border-purple-800/30');
                searchBtn.classList.remove('bg-purple-600', 'text-white', 'border-purple-400', 'shadow-[0_0_15px_rgba(147,51,234,0.5)]');
                window.showNavbarAlert('Web Search Dinonaktifkan', 'info');
            }
        });
    }

    if (micBtn) {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = 'id-ID';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (messageInput) {
                    messageInput.value += (messageInput.value ? ' ' : '') + transcript;
                    messageInput.style.height = 'auto';
                    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
                }
                micBtn.classList.remove('text-red-500', 'animate-pulse');
                micBtn.classList.add('text-purple-500/40');
            };
            recognition.onerror = () => {
                micBtn.classList.remove('text-red-500', 'animate-pulse');
                micBtn.classList.add('text-purple-500/40');
                window.showNavbarAlert('Gagal mengenali suara', 'error');
            };
            recognition.onend = () => {
                micBtn.classList.remove('text-red-500', 'animate-pulse');
                micBtn.classList.add('text-purple-500/40');
            };
            micBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (micBtn.classList.contains('text-red-500')) {
                    recognition.stop();
                } else {
                    recognition.start();
                    micBtn.classList.remove('text-purple-500/40');
                    micBtn.classList.add('text-red-500', 'animate-pulse');
                }
            });
        } else {
            micBtn.style.display = 'none';
        }
    }
    
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => { 
            if (e.isComposing || e.keyCode === 229) return; 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); e.stopPropagation(); sendMessage(); 
            } 
        });
        messageInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 120) + 'px'; });
    }
    
    if (sendBtn) sendBtn.addEventListener('click', (e) => { e.preventDefault(); sendMessage(); });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.options-btn')) { document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden')); }
    });

    if (chatContainer) {
        chatContainer.addEventListener('scroll', () => {
            const threshold = 150;
            const position = chatContainer.scrollTop + chatContainer.clientHeight;
            const height = chatContainer.scrollHeight;
            userIsScrolling = (height - position > threshold);
        });
    }

    window.showNavbarAlert = function(message, type = 'info') {
        const alertBox = document.getElementById('navbar-alert');
        const alertText = document.getElementById('navbar-alert-text');
        const alertIcon = document.getElementById('navbar-alert-icon');
        if (alertBox && alertText && alertIcon) {
            alertText.innerText = message;
            alertBox.classList.remove('opacity-0', 'pointer-events-none', 'scale-90');
            alertBox.classList.add('opacity-100', 'scale-100');
            if (type === 'success') { alertBox.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-green-900/80 border border-green-500/30 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 opacity-100 transform scale-100 z-[10000]"; alertIcon.className = "fas fa-check-circle text-green-400 text-xs"; } 
            else if (type === 'error') { alertBox.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-red-900/80 border border-red-500/30 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 opacity-100 transform scale-100 z-[10000]"; alertIcon.className = "fas fa-exclamation-circle text-red-400 text-xs"; } 
            else { alertBox.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#1c1c2e] border border-purple-900/30 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 opacity-100 transform scale-100 z-[10000]"; alertIcon.className = "fas fa-info-circle text-purple-400 text-xs"; }
            setTimeout(() => { alertBox.classList.add('opacity-0', 'pointer-events-none', 'scale-90'); alertBox.classList.remove('opacity-100', 'scale-100'); }, 3000);
        }
    };

    window.previewCode = async function(btn) {
        const container = btn.closest('.terminal-container');
        if (!container) return;
        const codeText = container.querySelector('.raw-code')?.value;
        const hljsEl = container.querySelector('.hljs');
        const langClass = hljsEl ? Array.from(hljsEl.classList).find(c => c !== 'hljs') : 'html';
        const type = langClass || 'html';
        if (!codeText) return;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        try {
            const response = await fetch('/dardcorchat/ai/store-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeText, type: type })
            });
            if (!checkAuth(response)) return;
            const data = await response.json();
            if (data.success) {
                const overlay = document.getElementById('diagram-overlay');
                const frame = document.getElementById('diagram-frame');
                frame.src = `/dardcorchat/dardcor-ai/preview/${data.previewId}`;
                overlay.classList.remove('hidden');
            } else {
                window.showNavbarAlert('Gagal memproses preview', 'error');
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Error sistem preview', 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-play"></i> Preview';
        }
    };

    window.previewDiagram = async function(btn) {
        const container = btn.closest('.terminal-container');
        if (!container) return;
        const codeText = container.querySelector('.raw-code')?.value;
        if (!codeText) return;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        try {
            const response = await fetch('/dardcorchat/ai/store-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeText, type: 'mermaid' })
            });
            if (!checkAuth(response)) return;
            const data = await response.json();
            if (data.success) {
                const overlay = document.getElementById('diagram-overlay');
                const frame = document.getElementById('diagram-frame');
                frame.src = `/dardcorchat/dardcor-ai/diagram/${data.previewId}`;
                overlay.classList.remove('hidden');
            } else {
                window.showNavbarAlert('Gagal memproses diagram', 'error');
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Error sistem diagram', 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-project-diagram"></i> Preview Diagram';
        }
    };

    window.copyCode = function(btn) {
        const container = btn.closest('.terminal-container');
        if (!container) return;
        const codeText = container.querySelector('.raw-code')?.value;
        if (codeText) {
            navigator.clipboard.writeText(codeText).then(() => {
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check text-green-400"></i>';
                setTimeout(() => { btn.innerHTML = original; }, 2000);
            });
        }
    };

    window.copyMessageBubble = function(btn) {
        const container = btn.closest('.message-bubble-container');
        const textDiv = container.querySelector('.markdown-body') || container.querySelector('.user-text');
        if (textDiv) {
            navigator.clipboard.writeText(textDiv.innerText).then(() => {
                const icon = btn.querySelector('i');
                const originalClass = icon.className;
                icon.className = 'fas fa-check text-green-400';
                setTimeout(() => { icon.className = originalClass; }, 2000);
            });
        }
    };

    window.editMessage = function(btn) {
        const container = btn.closest('.message-bubble-container');
        const textDiv = container.querySelector('.user-text');
        if (textDiv && messageInput) {
            messageInput.value = textDiv.innerText;
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
            messageInput.focus();
        }
    };

    window.speakMessage = function(btn) {
        const container = btn.closest('.message-bubble-container');
        const textDiv = container.querySelector('.markdown-body') || container.querySelector('.user-text');
        if (textDiv) {
            const text = textDiv.innerText;
            if (currentUtterance) { window.speechSynthesis.cancel(); currentUtterance = null; }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            window.speechSynthesis.speak(utterance);
            currentUtterance = utterance;
        }
    };

    window.updateActiveChatUI = function(id) {
        const historyItems = document.querySelectorAll('.chat-item');
        historyItems.forEach(el => {
            el.classList.remove('bg-[#202336]', 'text-white', 'border-purple-900', 'border-l-2');
            el.classList.add('text-gray-400', 'border-l-2', 'border-transparent', 'hover:bg-white/5');
            const btn = el.querySelector('.options-btn');
            if (btn) {
                btn.classList.remove('opacity-100');
                btn.classList.add('opacity-0', 'group-hover:opacity-100');
            }
        });

        const newChatStatic = document.getElementById('current-new-chat-item');
        const newChatHistory = document.getElementById('new-chat-highlight-target');

        const activeEl = document.getElementById(`chat-item-${id}`);
        const isNew = (!id || id === 'new' || !activeEl);

        if (isNew) {
            if(newChatStatic) {
                newChatStatic.classList.add('bg-[#202336]', 'text-white', 'border-purple-900');
                newChatStatic.classList.remove('text-gray-400', 'hover:bg-white/5', 'border-transparent'); 
            }

            if(newChatHistory) {
                newChatHistory.classList.add('bg-[#202336]', 'text-white', 'border-purple-900', 'border-l-2');
                newChatHistory.classList.remove('text-gray-400', 'border-transparent', 'hover:bg-white/5');
            }
        } else {
            if (newChatStatic) {
                newChatStatic.classList.remove('bg-[#202336]', 'text-white');
                newChatStatic.classList.add('text-gray-400', 'hover:bg-white/5', 'border-purple-900'); 
                newChatStatic.classList.remove('border-transparent');
            }

            if(newChatHistory) {
                newChatHistory.classList.remove('bg-[#202336]', 'text-white', 'border-purple-900');
                newChatHistory.classList.add('text-gray-400', 'border-l-2', 'border-transparent', 'hover:bg-white/5');
            }

            if (activeEl) {
                activeEl.classList.remove('text-gray-400', 'border-transparent', 'hover:bg-white/5');
                activeEl.classList.add('bg-[#202336]', 'text-white', 'border-purple-900', 'border-l-2');
                const btn = activeEl.querySelector('.options-btn');
                if (btn) {
                    btn.classList.remove('opacity-0', 'group-hover:opacity-100');
                    btn.classList.add('opacity-100');
                }
            }
        }
        document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
    };

    window.createNewChat = async function() {
        if (abortController) abortController.abort();
        resetChatState();
        try {
            const res = await fetch('/dardcorchat/ai/new-chat', { method: 'POST' });
            if (!checkAuth(res)) return;
            const data = await res.json();
            if (data.success) {
                const newId = data.redirectUrl.split('/').pop();
                serverData.currentConversationId = newId;
                window.updateActiveChatUI(newId);
                window.loadChat(newId);
                window.showNavbarAlert('Percakapan baru dibuat', 'success');
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Gagal membuat chat baru', 'error');
        }
    };

    window.loadChat = async function(id) {
        if (isChatLoading) resetChatState(); 
        isChatLoading = true;
        
        loadingTimeout = setTimeout(() => { isChatLoading = false; }, 5000); 

        window.closeSidebarIfMobile();
        serverData.currentConversationId = id;
        window.updateActiveChatUI(id);
        
        try {
            const res = await fetch(`/api/chat/${id}`);
            if (!checkAuth(res)) return;
            if (!res.ok) throw new Error('Network error');
            const data = await res.json();
            
            if (data.success && messageList) {
                messageList.innerHTML = '';
                
                if (!data.history || data.history.length === 0) {
                    renderEmptyState();
                } else {
                    messageList.className = "w-full max-w-3xl mx-auto flex flex-col gap-6 pt-4 pb-4";
                    const fragment = document.createDocumentFragment();
                    data.history.forEach(msg => {
                        const el = createMessageElementSync(msg.role, msg.message, msg.file_metadata);
                        fragment.appendChild(el);
                    });
                    messageList.appendChild(fragment);
                    
                    setTimeout(() => {
                        initHighlight();
                        scrollToBottom(true);
                    }, 100);
                }
                window.history.pushState({ id: id }, '', `/dardcorchat/dardcor-ai/${id}`);
            } else {
                window.history.pushState(null, '', '/dardcorchat/dardcor-ai');
                renderEmptyState();
            }
        } catch (e) {
            window.history.pushState(null, '', '/dardcorchat/dardcor-ai');
            renderEmptyState();
        } finally {
            clearTimeout(loadingTimeout);
            isChatLoading = false;
        }
    };

    const pathSegments = window.location.pathname.split('/');
    const possibleId = pathSegments[pathSegments.length - 1];
    
    if (possibleId && possibleId.length > 20 && possibleId !== 'dardcor-ai') {
        serverData.currentConversationId = possibleId;
        window.loadChat(possibleId);
    } else if (serverData.currentConversationId) {
         window.loadChat(serverData.currentConversationId);
    }

    function createMessageElementSync(role, text, files = []) {
        const div = document.createElement('div');
        div.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'} message-bubble-container group min-w-0`;
        
        let fileHtml = '';
        if (files && files.length > 0) {
            const justify = role === 'user' ? 'justify-end' : 'justify-start';
            fileHtml = `<div class="flex flex-wrap gap-2 mb-2 ${justify} w-full">`;
            files.forEach(f => {
                const mimetype = (f.type || f.mimetype || '').toLowerCase();
                const filename = f.name || f.filename || 'Unknown File';
                if (mimetype.startsWith('image/')) {
                    const imgUrl = f instanceof File ? URL.createObjectURL(f) : (f.url || f.path);
                    if (imgUrl) fileHtml += `<div class="relative rounded-lg overflow-hidden border border-purple-900/30 shadow-lg group transition-transform hover:scale-105 bg-[#0e0e14] min-w-[100px] min-h-[100px]"><img src="${imgUrl}" class="max-w-[200px] max-h-[200px] object-cover block"></div>`;
                } else {
                    const iconClass = getFileIconClass(mimetype, filename);
                    fileHtml += `<div class="text-[10px] flex items-center gap-2 bg-[#0e0e14] px-3 py-1.5 rounded-lg border border-purple-900/30 text-gray-300 max-w-full shadow-sm cursor-default"><i class="fas ${iconClass}"></i> <span class="truncate">${escapeHtml(filename)}</span></div>`;
                }
            });
            fileHtml += `</div>`;
        }

        const bubbleClass = role === 'user' ? 'bg-transparent border border-purple-600/50 text-white rounded-br-sm shadow-[0_0_15px_rgba(147,51,234,0.15)]' : 'bg-transparent text-gray-200 rounded-bl-sm border-none';
        
        let contentHtml = '';
        if (role === 'user') {
            const safeText = escapeHtml(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-purple-500 hover:text-purple-300 hover:underline break-all">$1</a>');
            contentHtml = `<div class="whitespace-pre-wrap break-words user-text">${safeText}</div>`;
        } else {
            const parsed = parseMessageContent(text);

            const identityHtml = `
                <div class="unified-header" style="cursor: default;">
                    <div class="header-content-wrapper static-mode">
                        <div class="logo-stack">
                            <img src="/logo.png" class="main-logo">
                        </div>
                        <span class="bot-name-display">Dardcor AI</span>
                    </div>
                </div>
            `;
            
            contentHtml = identityHtml;
            contentHtml += `<div class="chat-content-box relative rounded-2xl px-5 py-3.5 shadow-md text-sm ${bubbleClass} w-fit min-w-0 max-w-full overflow-hidden leading-7">
                <div class="markdown-body w-full max-w-full overflow-hidden break-words">${typeof marked !== 'undefined' ? marked.parse(parsed.answer) : parsed.answer}</div>
             </div>`;
        }

        let actions = '';
        if (role === 'user') {
            actions = `<div class="flex items-center gap-3 mt-1 px-1 select-none opacity-50 group-hover:opacity-100 transition-opacity"><button onclick="window.editMessage(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Edit Pesan"><i class="fas fa-edit"></i> Edit</button><button onclick="window.copyMessageBubble(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Salin Pesan"><i class="fas fa-copy"></i> Salin</button></div>`;
        } else {
            actions = `<div class="flex items-center gap-3 mt-1 px-1 select-none opacity-50 group-hover:opacity-100 transition-opacity"><button onclick="window.copyMessageBubble(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Salin"><i class="fas fa-copy"></i> Salin</button><button onclick="window.speakMessage(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Dengarkan"><i class="fas fa-volume-up"></i> Dengar</button></div>`;
        }

        if (role === 'user') {
             div.innerHTML = `<div class="flex flex-col items-end w-full max-w-full min-w-0">${fileHtml}<div class="chat-content-box relative rounded-2xl px-5 py-3.5 shadow-md text-sm ${bubbleClass} w-fit min-w-0 max-w-full overflow-hidden leading-7">${contentHtml}</div>${actions}</div>`;
        } else {
             div.innerHTML = `<div class="flex flex-col items-start w-full max-w-full min-w-0">${fileHtml}${contentHtml}${actions}</div>`;
        }
        
        return div;
    }

    function renderEmptyState() { 
        if (!messageList) return; 
        messageList.innerHTML = `<div id="empty-state" class="flex flex-col items-center justify-center flex-grow h-full w-full min-h-[60vh] pt-10"><div class="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center mb-6 md:mb-8 perspective-[1000px]"><div class="absolute inset-0 bg-purple-900/20 rounded-full blur-3xl animate-pulse"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-orbit-1 border-t-transparent border-l-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)] animate-orbit-2 border-b-transparent border-r-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-violet-500/50 animate-orbit-3 border-t-transparent border-r-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-indigo-500/40 animate-orbit-4 border-b-transparent border-l-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-pink-500/40 animate-orbit-5 border-l-transparent border-r-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-cyan-500/40 animate-orbit-6 border-t-transparent border-b-transparent"></div><div class="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-purple-400/20 bg-[#050508] relative z-10 shadow-[0_0_40px_rgba(147,51,234,0.3)]"><div class="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-transparent to-black z-10"></div><img src="/logo.png" alt="Logo" class="relative w-full h-full object-cover opacity-90"></div></div><h2 class="text-3xl md:text-5xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-white to-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">Dardcor AI</h2><p class="text-sm md:text-base text-purple-300/60 text-center max-w-xs md:max-w-md px-4 leading-relaxed font-light tracking-wide">Apa yang bisa saya bantu?</p></div>`; 
        messageList.className = "w-full max-w-3xl mx-auto flex flex-col h-full items-center justify-center pb-4"; 
    }

    function appendMessage(role, text, files = []) {
        if (!messageList) return null;
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.remove();
        messageList.classList.remove('h-full', 'items-center', 'justify-center');
        messageList.className = "w-full max-w-3xl mx-auto flex flex-col gap-6 pt-4 pb-4";
        const div = createMessageElementSync(role, text, files);
        messageList.appendChild(div);
        
        if (role === 'bot' && text !== '...loading_placeholder...') {
            const body = div.querySelector('.markdown-body');
            if (body && window.renderMathInElement) { renderMathInElement(body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }, { left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); }
            if (body && typeof hljs !== 'undefined') { body.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el)); }
        }
        return div;
    }

    async function sendMessage() {
        if (isSending) { if (abortController) { abortController.abort(); abortController = null; isSending = false; if (sendIcon) sendIcon.classList.replace('fa-stop', 'fa-paper-plane'); document.getElementById('loading-indicator')?.remove(); } return; }
        const msg = messageInput ? messageInput.value.trim() : '';
        if (!msg && selectedFiles.length === 0) return;
        isSending = true; abortController = new AbortController();
        if (sendIcon) sendIcon.classList.replace('fa-paper-plane', 'fa-stop');
        if (messageInput) { messageInput.blur(); messageInput.value = ''; messageInput.style.height = 'auto'; }
        if (filePreviewContainer) filePreviewContainer.classList.add('hidden');
        
        const userDiv = createMessageElementSync('user', msg, selectedFiles);
        messageList.appendChild(userDiv);
        
        const loaderDiv = document.createElement('div');
        loaderDiv.id = 'loading-indicator';
        loaderDiv.className = "flex w-full justify-start message-bubble-container group min-w-0";
        
        loaderDiv.innerHTML = `
            <div class="flex flex-col items-start w-full max-w-full min-w-0">
                <div class="unified-header">
                    <div class="header-content-wrapper static-mode">
                        <div class="logo-stack">
                            <div class="spinner-ring active"></div>
                            <img src="/logo.png" class="main-logo">
                        </div>
                        <span class="bot-name-display animate-pulse">Dardcor AI Thinking...</span>
                    </div>
                </div>
            </div>`;
        
        messageList.appendChild(loaderDiv);
        
        scrollToBottom(true);
        const emptyState = document.getElementById('empty-state'); if (emptyState) emptyState.remove();
        messageList.classList.remove('h-full', 'items-center', 'justify-center');
        messageList.className = "w-full max-w-3xl mx-auto flex flex-col gap-6 pt-4 pb-4";

        const fd = new FormData();
        fd.append('message', msg);
        fd.append('conversationId', serverData.currentConversationId || '');
        fd.append('toolType', currentToolType);
        fd.append('useWebSearch', isSearchEnabled);
        selectedFiles.forEach(f => fd.append('file_attachment', f));
        selectedFiles = []; if (fileInput) fileInput.value = '';

        try {
            const response = await fetch('/dardcorchat/ai/chat-stream', { method: 'POST', body: fd, signal: abortController.signal });
            if (!checkAuth(response)) return;
            if (!response.ok) throw new Error("Server Error");
            loaderDiv.remove();
            
            const botDiv = document.createElement('div');
            botDiv.className = "flex w-full justify-start message-bubble-container group min-w-0";
            
            botDiv.innerHTML = `<div class="flex flex-col items-start w-full max-w-full min-w-0">
                <div id="dynamic-header"></div>
                <div id="main-content-container" class="chat-content-box relative rounded-2xl px-5 py-3.5 shadow-md text-sm bg-transparent text-gray-200 rounded-bl-sm border-none w-fit min-w-0 max-w-full overflow-hidden leading-7 hidden">
                    <div class="markdown-body w-full max-w-full overflow-hidden break-words"></div>
                </div>
                <div class="flex items-center gap-3 mt-1 px-1 select-none opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onclick="window.copyMessageBubble(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Salin"><i class="fas fa-copy"></i> Salin</button>
                    <button onclick="window.speakMessage(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Dengarkan"><i class="fas fa-volume-up"></i> Dengar</button>
                </div>
            </div>`;
            
            if (messageList) messageList.appendChild(botDiv);
            
            const headerContainer = botDiv.querySelector('#dynamic-header');
            const mainContainer = botDiv.querySelector('#main-content-container');
            const botContent = botDiv.querySelector('.markdown-body');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let accumulatedAnswer = "";
            let buffer = "";
            let isStreaming = true;
            let lastUpdate = 0;

            headerContainer.innerHTML = `
                <div class="unified-header">
                    <div class="header-content-wrapper static-mode">
                        <div class="logo-stack">
                            <div class="spinner-ring active"></div>
                            <img src="/logo.png" class="main-logo">
                        </div>
                        <span class="bot-name-display animate-pulse">Dardcor AI Thinking...</span>
                    </div>
                </div>`;

            const render = (timestamp) => {
                if (!isStreaming) return;
                if (timestamp - lastUpdate < 100) { requestAnimationFrame(render); return; }
                lastUpdate = timestamp;
                
                const staticHeader = headerContainer.querySelector('.unified-header');
                if (staticHeader && accumulatedAnswer) {
                     const spinner = staticHeader.querySelector('.spinner-ring');
                     const nameDisplay = staticHeader.querySelector('.bot-name-display');
                     if(spinner) spinner.classList.remove('active');
                     if(nameDisplay) {
                         nameDisplay.innerText = "Dardcor AI";
                         nameDisplay.classList.remove('animate-pulse');
                     }
                }

                if (accumulatedAnswer) {
                    if (mainContainer) {
                        mainContainer.classList.remove('hidden');
                        
                        let tempFormatted = accumulatedAnswer;
                        const codeBlockCount = (tempFormatted.match(/```/g) || []).length;
                        if (codeBlockCount % 2 !== 0) tempFormatted += "\n```";
                        
                        if (typeof marked !== 'undefined') {
                            botContent.innerHTML = marked.parse(tempFormatted);
                            if (window.renderMathInElement) { renderMathInElement(botContent, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }, { left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); }
                            if (typeof hljs !== 'undefined') botContent.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
                        }
                    }
                }
                
                if (!userIsScrolling && chatContainer) {
                    const threshold = 150;
                    const position = chatContainer.scrollTop + chatContainer.clientHeight;
                    const height = chatContainer.scrollHeight;
                    if (height - position <= threshold) {
                        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'auto' });
                    }
                }
                requestAnimationFrame(render);
            };
            requestAnimationFrame(render);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split('\n\n');
                buffer = chunks.pop() || ''; 

                for (const chunkBlock of chunks) {
                    if (!chunkBlock.trim()) continue;
                    const lines = chunkBlock.split('\n');
                    let eventType = 'message'; 
                    let data = null;

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            eventType = line.substring(7).trim();
                        } else if (line.startsWith('data: ')) {
                            try {
                                data = JSON.parse(line.substring(6));
                            } catch(e) {}
                        }
                    }

                    if (data) {
                        if (eventType === 'message') {
                            if (data.chunk) accumulatedAnswer += data.chunk;
                        } else if (eventType === 'error') {
                            window.showNavbarAlert(data.error || 'Error', 'error');
                        }
                    }
                }
            }
            isStreaming = false; 
            
            const staticHeader = headerContainer.querySelector('.unified-header');
            if (staticHeader) {
                 const spinner = staticHeader.querySelector('.spinner-ring');
                 const nameDisplay = staticHeader.querySelector('.bot-name-display');
                 if(spinner) spinner.classList.remove('active');
                 if(nameDisplay) {
                     nameDisplay.innerText = "Dardcor AI";
                     nameDisplay.classList.remove('animate-pulse');
                 }
            }

            if (accumulatedAnswer && mainContainer) {
                mainContainer.classList.remove('hidden');
                botContent.innerHTML = marked.parse(accumulatedAnswer);
                if (window.renderMathInElement) { renderMathInElement(botContent, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }, { left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); }
                if (typeof hljs !== 'undefined') botContent.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
            }
            
            scrollToBottom(true);

        } catch (e) {
            if (e.name === 'AbortError') return;
            document.getElementById('loading-indicator')?.remove();
            window.showNavbarAlert('Gagal mengirim pesan', 'error');
        } finally {
            isSending = false; 
            abortController = null; 
            if (sendIcon) sendIcon.classList.replace('fa-stop', 'fa-paper-plane');
        }
    }

    function scrollToBottom(force = false) { 
        if (!chatContainer) return; 
        const threshold = 150; 
        const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight <= threshold; 
        if (force || isNearBottom) chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'auto' }); 
    }
    
    function initHighlight() { 
        document.querySelectorAll('.message-bubble-container .raw-message-content').forEach(raw => { 
            const container = raw.nextElementSibling;
            if (!container) return;
            const mdBody = container.querySelector('.markdown-body');
            
            if (mdBody && mdBody.innerHTML.trim() === '') { 
                const parsed = parseMessageContent(raw.value || '');
                if (typeof marked !== 'undefined') {
                    mdBody.innerHTML = marked.parse(parsed.answer);
                } else {
                    mdBody.innerText = parsed.answer;
                }
            } 
        });

        document.querySelectorAll('.markdown-body').forEach(body => {
            if (window.renderMathInElement) {
                try {
                    renderMathInElement(body, { 
                        delimiters: [
                            { left: '$$', right: '$$', display: true }, 
                            { left: '$', right: '$', display: false }, 
                            { left: '\\[', right: '\\]', display: true }, 
                            { left: '\\(', right: '\\)', display: false }
                        ], 
                        throwOnError: false 
                    });
                } catch (e) { console.error("KaTeX Error:", e); }
            }

            if (typeof hljs !== 'undefined') {
                body.querySelectorAll('pre code').forEach(el => {
                    if (!el.dataset.highlighted) {
                        hljs.highlightElement(el);
                        el.dataset.highlighted = "true";
                    }
                });
            }
        });
    }

    if (messageList) { 
        const hasMessages = messageList.querySelectorAll('.message-bubble-container').length > 0; 
        const isActuallyEmpty = !hasMessages; 
        if (isActuallyEmpty) { 
            messageList.innerHTML = ''; 
            renderEmptyState(); 
        } else { 
            initHighlight(); 
            scrollToBottom(true); 
        } 
    }

    window.toggleMenu = function(event, menuId) {
        if (event) event.stopPropagation();
        document.querySelectorAll('[id^="menu-"]').forEach(el => { if (el.id !== menuId) el.classList.add('hidden'); });
        const menu = document.getElementById(menuId);
        if (menu) menu.classList.toggle('hidden');
    };

    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (!sidebar) return;
        
        let newState = 'open';
        
        if (window.innerWidth < 1024) {
            sidebar.classList.toggle('-translate-x-full');
            if (overlay) overlay.classList.toggle('hidden');
            newState = sidebar.classList.contains('-translate-x-full') ? 'closed' : 'open';
        } else {
            document.body.classList.toggle('sidebar-closed');
            newState = document.body.classList.contains('sidebar-closed') ? 'closed' : 'open';
        }
        
        localStorage.setItem('dardcor_sidebar_state', newState);
    };

    window.closeSidebarIfMobile = function() {
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobile-overlay');
            if (sidebar) sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }
    };

    window.closePreview = function() {
        const overlay = document.getElementById('diagram-overlay');
        const frame = document.getElementById('diagram-frame');
        if (overlay) overlay.classList.add('hidden');
        if (frame) setTimeout(() => { frame.src = 'about:blank'; }, 300);
    };

    window.openRenameModal = function(id) {
        chatToEdit = id;
        const currentTitleEl = document.getElementById(`raw-title-${id}`);
        const input = document.getElementById('rename-input');
        const modal = document.getElementById('rename-modal');
        if (input && currentTitleEl) input.value = currentTitleEl.value;
        if (modal) modal.classList.add('active');
        document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
    };

    window.openDeleteModal = function(id) {
        chatToDelete = id;
        const modal = document.getElementById('delete-modal');
        if (modal) modal.classList.add('active');
        document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
    };

    window.closeModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    };

    window.closeModals = function() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    };

    window.submitRename = async function() {
        const input = document.getElementById('rename-input');
        const newTitle = input ? input.value : '';
        if (!newTitle || !chatToEdit) return;
        try {
            const res = await fetch('/dardcorchat/ai/rename-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: chatToEdit, newTitle }) });
            if (!checkAuth(res)) return;
            if (res.ok) {
                const titleEl = document.getElementById(`title-${chatToEdit}`);
                const rawInput = document.getElementById(`raw-title-${chatToEdit}`);
                if (titleEl) titleEl.innerText = newTitle.length > 25 ? newTitle.substring(0, 25) + '...' : newTitle;
                if (rawInput) rawInput.value = newTitle;
                window.showNavbarAlert('Nama percakapan diperbarui', 'success');
                window.closeModal('rename-modal');
            } else {
                window.showNavbarAlert('Gagal mengubah nama', 'error');
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Terjadi kesalahan sistem', 'error');
        }
    };
    
    window.submitDelete = async function() {
        if (!chatToDelete) return;
        try {
            const res = await fetch('/dardcorchat/ai/delete-chat-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: chatToDelete }) });
            if (!checkAuth(res)) return;
            if (res.ok) {
                const item = document.getElementById(`chat-item-${chatToDelete}`);
                if (item) item.remove();
                if (serverData.currentConversationId === chatToDelete) {
                    serverData.currentConversationId = '';
                    messageList.innerHTML = '';
                    renderEmptyState();
                    window.history.pushState(null, '', '/dardcorchat/dardcor-ai');
                }
                window.showNavbarAlert('Percakapan dihapus', 'success');
                window.closeModal('delete-modal');
            } else {
                window.showNavbarAlert('Gagal menghapus percakapan', 'error');
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Terjadi kesalahan sistem', 'error');
        }
    };
});