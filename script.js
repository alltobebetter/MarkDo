// 配置marked选项
const renderer = new marked.Renderer();

// 自定义代码块渲染
renderer.code = function(code, language) {
    const lang = language || 'text';
    let highlightedCode;

    if (language && hljs.getLanguage(language)) {
        try {
            highlightedCode = hljs.highlight(code, { language: language }).value;
        } catch (err) {
            highlightedCode = hljs.highlightAuto(code).value;
        }
    } else {
        highlightedCode = hljs.highlightAuto(code).value;
    }

    return `
        <div class="code-block-container">
            <div class="code-block-header">
                <span class="code-language">${lang}</span>
                <button class="code-copy-btn" onclick="copyCodeToClipboard(this)" title="复制代码">
                    <i data-lucide="copy"></i>
                    复制
                </button>
            </div>
            <pre><code class="language-${lang}">${highlightedCode}</code></pre>
        </div>
    `;
};

marked.setOptions({
    renderer: renderer,
    breaks: true,
    gfm: true
});

const input = document.getElementById('markdown-input');
const preview = document.getElementById('preview');

// 撤销/重做功能
class UndoRedoManager {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 100;
        this.isUndoRedo = false;
    }

    saveState(content) {
        if (this.isUndoRedo) return;

        // 如果当前不在历史记录末尾，删除后面的记录
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // 避免重复保存相同内容
        if (this.history.length > 0 && this.history[this.history.length - 1] === content) {
            return;
        }

        this.history.push(content);
        this.currentIndex++;

        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }
    }

    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.isUndoRedo = true;
            const content = this.history[this.currentIndex];
            input.value = content;
            updatePreview();
            this.isUndoRedo = false;
            return true;
        }
        return false;
    }

    redo() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            this.isUndoRedo = true;
            const content = this.history[this.currentIndex];
            input.value = content;
            updatePreview();
            this.isUndoRedo = false;
            return true;
        }
        return false;
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }
}

const undoRedoManager = new UndoRedoManager();

function updatePreview() {
    let markdownText = input.value;

    // 预处理：处理跨行的$$公式块
    markdownText = preprocessMath(markdownText);

    const htmlContent = marked.parse(markdownText);
    preview.innerHTML = htmlContent;

    // 渲染LaTeX数学公式
    renderMathInElement(preview, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\[', right: '\\]', display: true},
            {left: '\\(', right: '\\)', display: false}
        ],
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false,
        trust: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        macros: {
            "\\RR": "\\mathbb{R}",
            "\\NN": "\\mathbb{N}",
            "\\ZZ": "\\mathbb{Z}",
            "\\QQ": "\\mathbb{Q}",
            "\\CC": "\\mathbb{C}"
        }
    });

    // 重新初始化新添加的图标
    lucide.createIcons();
}

// 预处理数学公式，处理跨行的$$块
function preprocessMath(text) {
    // 分行处理，避免跨段落匹配
    const lines = text.split('\n');
    const result = [];
    let inMathBlock = false;
    let mathContent = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (!inMathBlock && trimmedLine === '$$') {
            // 开始数学块
            inMathBlock = true;
            mathContent = [];
        } else if (inMathBlock && trimmedLine === '$$') {
            // 结束数学块
            inMathBlock = false;
            const formula = mathContent.join(' ').trim();
            result.push('$$' + formula + '$$');
            mathContent = [];
        } else if (inMathBlock) {
            // 在数学块内部
            mathContent.push(trimmedLine);
        } else {
            // 普通行
            result.push(line);
        }
    }

    // 如果还有未闭合的数学块，按原样处理
    if (inMathBlock) {
        result.push('$$');
        result.push(...mathContent);
    }

    return result.join('\n');
}

// 复制代码到剪贴板
function copyCodeToClipboard(button) {
    const codeBlock = button.closest('.code-block-container').querySelector('pre code');
    const codeText = codeBlock.textContent;
    const originalText = button.innerHTML;

    const showSuccess = () => {
        button.innerHTML = '<i data-lucide="check"></i>已复制';
        lucide.createIcons();
        setTimeout(() => {
            button.innerHTML = originalText;
            lucide.createIcons();
        }, 2000);
    };

    navigator.clipboard.writeText(codeText).then(showSuccess).catch(err => {
        console.error('复制失败:', err);
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = codeText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccess();
    });
}

// 初始化预览
updatePreview();

// 初始化图标
lucide.createIcons();

// 初始化撤销重做按钮状态
updateUndoRedoButtons();

// 撤销/重做函数
function undo() {
    if (undoRedoManager.undo()) {
        updateUndoRedoButtons();
        saveContent();
    }
}

function redo() {
    if (undoRedoManager.redo()) {
        updateUndoRedoButtons();
        saveContent();
    }
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
        undoBtn.disabled = !undoRedoManager.canUndo();
        undoBtn.style.opacity = undoRedoManager.canUndo() ? '1' : '0.5';
    }

    if (redoBtn) {
        redoBtn.disabled = !undoRedoManager.canRedo();
        redoBtn.style.opacity = undoRedoManager.canRedo() ? '1' : '0.5';
    }
}

// 监听输入变化
let inputTimer;
input.addEventListener('input', function() {
    updatePreview();
    updateWordCount();
    saveContent();

    // 防抖保存历史记录
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
        undoRedoManager.saveState(input.value);
        updateUndoRedoButtons();
    }, 500);
});

// 字数统计功能
function updateWordCount() {
    const content = input.value;
    const charCount = content.length;

    const wordCountElement = document.getElementById('wordCount');
    if (wordCountElement) {
        wordCountElement.textContent = `${charCount} 字符`;
    }
}

// 全屏功能
function toggleFullscreen() {
    const container = document.querySelector('.container');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    if (!document.fullscreenElement) {
        container.requestFullscreen().then(() => {
            fullscreenBtn.innerHTML = '<i data-lucide="minimize"></i>';
            lucide.createIcons();
        }).catch(err => {
            console.error('无法进入全屏模式:', err);
        });
    } else {
        document.exitFullscreen().then(() => {
            fullscreenBtn.innerHTML = '<i data-lucide="maximize"></i>';
            lucide.createIcons();
        });
    }
}

// 监听全屏状态变化
document.addEventListener('fullscreenchange', function() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!document.fullscreenElement) {
        fullscreenBtn.innerHTML = '<i data-lucide="maximize"></i>';
        lucide.createIcons();
    }
});

// 搜索替换功能
let searchState = {
    currentIndex: -1,
    matches: [],
    lastSearchText: ''
};

function showSearchBar() {
    const searchBar = document.getElementById('searchBar');
    searchBar.style.display = 'block';

    // 触发动画
    setTimeout(() => {
        searchBar.classList.add('show');
    }, 10);

    // 聚焦搜索输入框
    setTimeout(() => {
        document.getElementById('searchInput').focus();
        lucide.createIcons();
    }, 150);
}

function hideSearchBar() {
    const searchBar = document.getElementById('searchBar');
    searchBar.classList.remove('show');

    // 等待动画完成后隐藏
    setTimeout(() => {
        searchBar.style.display = 'none';
    }, 200);

    // 清除高亮
    clearSearchHighlight();

    // 隐藏替换行
    document.getElementById('replaceRow').style.display = 'none';
    document.getElementById('toggleReplaceBtn').classList.remove('active');

    // 重新聚焦编辑器
    input.focus();
}

function toggleReplace() {
    const replaceRow = document.getElementById('replaceRow');
    const toggleBtn = document.getElementById('toggleReplaceBtn');

    if (replaceRow.style.display === 'none') {
        replaceRow.style.display = 'flex';
        toggleBtn.classList.add('active');
        setTimeout(() => {
            document.getElementById('replaceInput').focus();
            lucide.createIcons();
        }, 100);
    } else {
        replaceRow.style.display = 'none';
        toggleBtn.classList.remove('active');
        document.getElementById('searchInput').focus();
    }
}

function clearSearchHighlight() {
    // 清除搜索状态
    searchState.matches = [];
    searchState.currentIndex = -1;
    updateSearchResults();
}

function updateSearchResults() {
    const resultsElement = document.getElementById('searchResults');
    if (searchState.matches.length === 0) {
        resultsElement.textContent = '';
    } else {
        resultsElement.textContent = `${searchState.currentIndex + 1}/${searchState.matches.length}`;
    }
}

function performSearch() {
    const searchText = document.getElementById('searchInput').value;
    const caseSensitive = document.getElementById('caseSensitive').checked;
    const useRegex = document.getElementById('useRegex').checked;

    if (!searchText) {
        clearSearchHighlight();
        return;
    }

    const content = input.value;
    let searchPattern;

    try {
        if (useRegex) {
            searchPattern = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
        } else {
            const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            searchPattern = new RegExp(escapedText, caseSensitive ? 'g' : 'gi');
        }
    } catch (e) {
        searchState.matches = [];
        updateSearchResults();
        return;
    }

    const matches = [...content.matchAll(searchPattern)];
    searchState.matches = matches;
    searchState.lastSearchText = searchText;

    if (matches.length === 0) {
        searchState.currentIndex = -1;
    } else {
        // 找到当前光标位置之后的第一个匹配
        const currentPos = input.selectionStart;
        let nextIndex = matches.findIndex(match => match.index >= currentPos);

        if (nextIndex === -1) {
            nextIndex = 0; // 从头开始
        }

        searchState.currentIndex = nextIndex;
        selectMatch(nextIndex);
    }

    updateSearchResults();
}

function findNext() {
    if (searchState.matches.length === 0) {
        performSearch();
        return;
    }

    searchState.currentIndex = (searchState.currentIndex + 1) % searchState.matches.length;
    selectMatch(searchState.currentIndex);
    updateSearchResults();
}

function findPrevious() {
    if (searchState.matches.length === 0) {
        performSearch();
        return;
    }

    searchState.currentIndex = searchState.currentIndex <= 0 ?
        searchState.matches.length - 1 :
        searchState.currentIndex - 1;
    selectMatch(searchState.currentIndex);
    updateSearchResults();
}

function selectMatch(index) {
    if (index >= 0 && index < searchState.matches.length) {
        const match = searchState.matches[index];
        input.setSelectionRange(match.index, match.index + match[0].length);
        input.focus();
    }
}

function replaceNext() {
    const searchText = document.getElementById('searchInput').value;
    const replaceText = document.getElementById('replaceInput').value;

    if (!searchText || searchState.matches.length === 0) return;

    const currentMatch = searchState.matches[searchState.currentIndex];
    if (!currentMatch) return;

    // 检查当前选中的文本是否匹配
    const selectedText = input.value.substring(input.selectionStart, input.selectionEnd);
    if (selectedText === currentMatch[0]) {
        const start = input.selectionStart;
        const end = input.selectionEnd;

        input.value = input.value.substring(0, start) + replaceText + input.value.substring(end);

        // 更新光标位置
        input.setSelectionRange(start, start + replaceText.length);

        updatePreview();
        updateWordCount();
        undoRedoManager.saveState(input.value);
        updateUndoRedoButtons();

        // 重新搜索以更新匹配列表
        performSearch();
    }

    // 查找下一个
    findNext();
}

function replaceAll() {
    const searchText = document.getElementById('searchInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    const caseSensitive = document.getElementById('caseSensitive').checked;
    const useRegex = document.getElementById('useRegex').checked;

    if (!searchText) return;

    let content = input.value;
    let searchPattern;

    try {
        if (useRegex) {
            searchPattern = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
        } else {
            const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            searchPattern = new RegExp(escapedText, caseSensitive ? 'g' : 'gi');
        }
    } catch (e) {
        updateSearchResults();
        return;
    }

    const matches = content.match(searchPattern);
    const replacedCount = matches ? matches.length : 0;

    if (replacedCount > 0) {
        const newContent = content.replace(searchPattern, replaceText);
        input.value = newContent;
        updatePreview();
        updateWordCount();
        undoRedoManager.saveState(input.value);
        updateUndoRedoButtons();

        // 清除搜索状态
        clearSearchHighlight();

        // 显示替换结果
        const resultsElement = document.getElementById('searchResults');
        resultsElement.textContent = `已替换 ${replacedCount} 处`;
        setTimeout(() => {
            resultsElement.textContent = '';
        }, 2000);
    } else {
        const resultsElement = document.getElementById('searchResults');
        resultsElement.textContent = '未找到';
        setTimeout(() => {
            resultsElement.textContent = '';
        }, 2000);
    }
}

// 快捷键支持
document.addEventListener('keydown', function(e) {
    // 撤销 Ctrl+Z
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }

    // 重做 Ctrl+Y 或 Ctrl+Shift+Z
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        redo();
    }

    // 搜索 Ctrl+F
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        showSearchBar();
    }

    // 全屏 F11
    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }

    // ESC键关闭弹窗
    if (e.key === 'Escape') {
        hideConfirmModal();
        hideSearchBar();
        hideInstallModal();
    }
});

// 主题切换功能
function toggleTheme() {
    const body = document.body;
    const container = document.querySelector('.container');
    const toolbar = document.getElementById('toolbar');
    const editorPanel = document.getElementById('editorPanel');
    const previewPanel = document.getElementById('previewPanel');
    const editorHeader = document.getElementById('editorHeader');
    const previewHeader = document.getElementById('previewHeader');
    const markdownInput = document.getElementById('markdown-input');
    const preview = document.getElementById('preview');
    const themeToggle = document.getElementById('themeToggle');

    const isDark = body.classList.contains('dark');

    if (isDark) {
        // 切换到浅色模式
        body.classList.remove('dark');
        container.classList.remove('dark');
        toolbar.classList.remove('dark');
        editorPanel.classList.remove('dark');
        previewPanel.classList.remove('dark');
        editorHeader.classList.remove('dark');
        previewHeader.classList.remove('dark');
        markdownInput.classList.remove('dark');
        preview.classList.remove('dark');

        themeToggle.innerHTML = '<i data-lucide="sun"></i>';
    } else {
        // 切换到暗黑模式
        body.classList.add('dark');
        container.classList.add('dark');
        toolbar.classList.add('dark');
        editorPanel.classList.add('dark');
        previewPanel.classList.add('dark');
        editorHeader.classList.add('dark');
        previewHeader.classList.add('dark');
        markdownInput.classList.add('dark');
        preview.classList.add('dark');

        themeToggle.innerHTML = '<i data-lucide="moon"></i>';
    }

    // 重新初始化图标
    lucide.createIcons();

    // 保存主题设置
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// 加载保存的主题设置
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        toggleTheme();
    }
}

// 页面加载时应用保存的主题
loadTheme();

// PWA功能
let deferredPrompt;
let isInstalled = false;

// 检测PWA安装状态
function checkPWAInstallStatus() {
    // 检查是否在独立模式下运行（已安装）
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
        isInstalled = true;
        document.getElementById('installBtn').style.display = 'none';
    }
}

// 监听PWA安装提示事件
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: Install prompt available');
    e.preventDefault();
    deferredPrompt = e;

    // 显示安装按钮
    const installBtn = document.getElementById('installBtn');
    if (installBtn && !isInstalled) {
        installBtn.style.display = 'flex';
    }

    // 首次访问时显示安装提示（可选）
    const hasShownInstallPrompt = localStorage.getItem('hasShownInstallPrompt');
    if (!hasShownInstallPrompt && !isInstalled) {
        setTimeout(() => {
            showInstallModal();
            localStorage.setItem('hasShownInstallPrompt', 'true');
        }, 5000); // 5秒后显示
    }
});

// 监听PWA安装完成事件
window.addEventListener('appinstalled', () => {
    console.log('PWA: App installed successfully');
    isInstalled = true;
    deferredPrompt = null;

    // 隐藏安装按钮
    document.getElementById('installBtn').style.display = 'none';
    hideInstallModal();

    // 显示安装成功提示
    showInstallSuccessToast();
});

// 显示安装提示
function showInstallPrompt() {
    if (deferredPrompt && !isInstalled) {
        showInstallModal();
    } else if (isInstalled) {
        alert('应用已经安装！');
    } else {
        alert('您的浏览器不支持应用安装功能');
    }
}

// 显示安装弹窗
function showInstallModal() {
    const modal = document.getElementById('installModal');
    const modalElement = document.getElementById('installModalContent');

    // 应用当前主题
    if (document.body.classList.contains('dark')) {
        modalElement.classList.add('dark');
    } else {
        modalElement.classList.remove('dark');
    }

    modal.classList.add('show');

    setTimeout(() => {
        lucide.createIcons();
    }, 100);
}

// 隐藏安装弹窗
function hideInstallModal() {
    const modal = document.getElementById('installModal');
    modal.classList.remove('show');
}

// 执行PWA安装
async function installPWA() {
    if (!deferredPrompt) {
        alert('安装功能暂时不可用');
        return;
    }

    try {
        // 显示安装提示
        deferredPrompt.prompt();

        // 等待用户响应
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('PWA: User accepted the install prompt');
        } else {
            console.log('PWA: User dismissed the install prompt');
        }

        deferredPrompt = null;
        hideInstallModal();

    } catch (error) {
        console.error('PWA: Install failed:', error);
        alert('安装失败，请重试');
    }
}

// 通用Toast创建函数
function createToast(message, bgColor = '#4CAF50', position = 'top') {
    const toast = document.createElement('div');
    const positionStyle = position === 'top' ? 'top: 20px; right: 20px;' : 'bottom: 20px; left: 50%; transform: translateX(-50%);';

    toast.style.cssText = `
        position: fixed;
        ${positionStyle}
        background: ${bgColor};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-family: "LXGW WenKai", sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    toast.innerHTML = message;
    return toast;
}

// 显示并自动移除Toast
function showToast(message, bgColor = '#4CAF50', position = 'top', duration = 3000) {
    const toast = createToast(message, bgColor, position);
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, duration);
}

// 显示安装成功提示
function showInstallSuccessToast() {
    showToast('✅ MarkDo已成功安装到您的设备！', '#4CAF50');
}

// 注册Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('PWA: Service Worker registered successfully:', registration);

            // 监听Service Worker更新
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // 有新版本可用
                        showUpdateAvailableToast();
                    }
                });
            });

        } catch (error) {
            console.error('PWA: Service Worker registration failed:', error);
        }
    }
}

// 显示更新可用提示
function showUpdateAvailableToast() {
    const toast = createToast('🔄 有新版本可用', '#2196F3', 'bottom');

    const updateBtn = document.createElement('button');
    updateBtn.textContent = '立即更新';
    updateBtn.style.cssText = `
        background: white;
        color: #2196F3;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 12px;
    `;
    updateBtn.onclick = () => window.location.reload();

    toast.appendChild(updateBtn);
    document.body.appendChild(toast);
}

// 初始化PWA
function initPWA() {
    checkPWAInstallStatus();
    registerServiceWorker();
}

// 页面加载完成后初始化PWA
window.addEventListener('load', initPWA);

// 搜索输入框事件监听
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const caseSensitive = document.getElementById('caseSensitive');
    const useRegex = document.getElementById('useRegex');

    // 搜索输入变化时实时搜索
    let searchTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            performSearch();
        }, 300); // 防抖
    });

    // 搜索框快捷键
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                findPrevious();
            } else {
                findNext();
            }
        }
    });

    // 替换框快捷键
    const replaceInput = document.getElementById('replaceInput');
    replaceInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.ctrlKey) {
                replaceAll();
            } else {
                replaceNext();
            }
        }
    });

    // 选项变化时重新搜索
    caseSensitive.addEventListener('change', function() {
        this.parentElement.classList.toggle('active', this.checked);
        performSearch();
    });

    useRegex.addEventListener('change', function() {
        this.parentElement.classList.toggle('active', this.checked);
        performSearch();
    });
});

// 保存内容到本地存储
function saveContent() {
    const content = input.value;
    localStorage.setItem('markdownContent', content);
}

// 从本地存储加载内容
function loadContent() {
    const savedContent = localStorage.getItem('markdownContent');
    if (savedContent !== null && savedContent.trim() !== '') {
        input.value = savedContent;
    } else {
        // 如果没有保存的内容，显示默认示例
        input.value = `# 欢迎使用MarkDo

这是一个**优雅简洁**的Markdown编辑器，支持实时预览和自动保存。

## 功能特点

- ⚡ 实时预览
- 🌈 代码语法高亮
- 📐 LaTeX数学公式支持
- 🌙 暗黑模式切换

## 示例

### 代码块
\`\`\`javascript
console.log('Hello, Markdown!');
\`\`\`

### 数学公式
行内公式：$E = mc^2$

块级公式：
$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

> 您的内容会自动保存，开始您的MarkDo写作之旅吧！`;
    }
    updatePreview();
}

// 页面加载时恢复保存的内容
loadContent();

// 初始化字数统计
updateWordCount();

// 定期自动保存（每30秒）
setInterval(saveContent, 30000);

// 文件导入功能
function importMarkdown() {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
}

// 处理文件导入
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 检查文件类型
    const validTypes = ['.md', '.markdown', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidType = validTypes.some(type => fileName.endsWith(type));

    if (!isValidType) {
        alert('请选择 .md、.markdown 或 .txt 文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        input.value = content;
        updatePreview();
        updateWordCount();
        undoRedoManager.saveState(content);
        updateUndoRedoButtons();
        saveContent();
    };

    reader.readAsText(file, 'UTF-8');

    // 清空文件输入，允许重复选择同一文件
    e.target.value = '';
});

// HTML导出功能
function exportToHTML() {
    try {
        // 检查是否有内容
        if (!input.value.trim()) {
            alert('请先输入一些内容再导出');
            return;
        }

        const filename = getExportFilename();
        const htmlContent = generateHTMLContent();

        // 创建下载链接
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename + '.html';

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 清理URL对象
        URL.revokeObjectURL(url);

        console.log('HTML导出成功');

    } catch (error) {
        console.error('HTML导出失败:', error);
        alert('HTML导出失败，请重试。错误信息：' + error.message);
    }
}

function generateHTMLContent() {
    const markdownContent = input.value;
    const htmlBody = marked.parse(markdownContent);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MarkDo导出文档</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <style>
        body {
            font-family: "LXGW WenKai", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.7;
            color: #444444;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #ffffff;
        }

        h1, h2, h3, h4, h5, h6 {
            margin: 0.5em 0 0.5em 0;
            color: #555555;
            font-weight: 600;
        }

        h1 {
            font-size: 2.2em;
            border-bottom: 3px solid #aaaaaa;
            padding-bottom: 10px;
        }

        h2 {
            font-size: 1.8em;
            border-bottom: 2px solid #bbbbbb;
            padding-bottom: 8px;
        }

        h3 {
            font-size: 1.5em;
            color: #777777;
        }

        p {
            margin: 0.8em 0;
            text-align: justify;
        }

        blockquote {
            border-left: 4px solid #3498db;
            margin: 1.5em 0;
            padding: 0.5em 1em;
            background: #ecf0f1;
            font-style: italic;
        }

        code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            color: #e74c3c;
            font-size: 0.9em;
        }

        pre {
            background: #f8f9fa;
            color: #495057;
            padding: 1.5em;
            border-radius: 5px;
            overflow-x: auto;
            margin: 1.5em 0;
            border: 1px solid #e9ecef;
        }

        pre code {
            background: none;
            color: inherit;
            padding: 0;
        }

        ul, ol {
            margin: 1em 0;
            padding-left: 2em;
        }

        li {
            margin: 0.5em 0;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5em 0;
        }

        th, td {
            border: 1px solid #bdc3c7;
            padding: 12px;
            text-align: left;
        }

        th {
            background: #34495e;
            color: white;
            font-weight: 600;
        }

        tr:nth-child(even) {
            background: #f8f9fa;
        }

        a {
            color: #3498db;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            margin: 1em 0;
        }

        hr {
            border: none;
            border-top: 2px solid #eee;
            margin: 2em 0;
        }
    </style>
</head>
<body>
${htmlBody}

<script src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
<script>
    // 代码高亮
    hljs.highlightAll();

    // 数学公式渲染
    renderMathInElement(document.body, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\[', right: '\\\\]', display: true},
            {left: '\\\\(', right: '\\\\)', display: false}
        ],
        throwOnError: false
    });
</script>
</body>
</html>`;
}

// 显示确认弹窗
function clearContent() {
    showConfirmModal();
}

// 显示自定义确认弹窗
function showConfirmModal() {
    const modal = document.getElementById('confirmModal');
    const modalElement = document.getElementById('modal');

    // 应用当前主题
    if (document.body.classList.contains('dark')) {
        modalElement.classList.add('dark');
    } else {
        modalElement.classList.remove('dark');
    }

    modal.classList.add('show');

    // 重新初始化图标
    setTimeout(() => {
        lucide.createIcons();
    }, 100);
}

// 隐藏确认弹窗
function hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
}

// 确认清空内容
function confirmClearContent() {
    input.value = '';
    updatePreview();
    saveContent();
    input.focus();
    hideConfirmModal();
}

// 点击遮罩层关闭弹窗
document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideConfirmModal();
    }
});

// ESC键关闭弹窗
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideConfirmModal();
    }
});

// 下载Markdown文件
function downloadMarkdown() {
    const markdownContent = input.value;
    const filename = getExportFilename();

    // 创建下载链接
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename + '.md';

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理URL对象
    URL.revokeObjectURL(url);
}

// 同步滚动（可选功能）
let isScrolling = false;

input.addEventListener('scroll', function() {
    if (isScrolling) return;
    isScrolling = true;

    const scrollPercentage = input.scrollTop / (input.scrollHeight - input.clientHeight);
    preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);

    setTimeout(() => { isScrolling = false; }, 100);
});

preview.addEventListener('scroll', function() {
    if (isScrolling) return;
    isScrolling = true;

    const scrollPercentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
    input.scrollTop = scrollPercentage * (input.scrollHeight - input.clientHeight);

    setTimeout(() => { isScrolling = false; }, 100);
});

// 工具栏功能函数
function finishEdit() {
    input.focus();
    updatePreview();
}

function insertMarkdown(prefix, suffix = '') {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);

    // 设置光标位置
    if (selectedText) {
        input.setSelectionRange(start, start + replacement.length);
    } else {
        input.setSelectionRange(start + prefix.length, start + prefix.length);
    }

    finishEdit();
}

function insertHeading(level) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);
    const prefix = '#'.repeat(level) + ' ';

    // 检查是否在行首
    const lineStart = input.value.lastIndexOf('\n', start - 1) + 1;
    const beforeCursor = input.value.substring(lineStart, start);

    if (beforeCursor.trim() === '') {
        // 在行首，直接插入
        const replacement = prefix + selectedText;
        input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
        input.setSelectionRange(start + prefix.length, start + replacement.length);
    } else {
        // 不在行首，换行后插入
        const replacement = '\n' + prefix + selectedText;
        input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
        input.setSelectionRange(start + replacement.length, start + replacement.length);
    }

    finishEdit();
}

function insertList(prefix) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);

    if (selectedText.includes('\n')) {
        // 多行选择，每行添加列表标记
        const lines = selectedText.split('\n');
        const replacement = lines.map(line => line.trim() ? prefix + line : line).join('\n');
        input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
        input.setSelectionRange(start, start + replacement.length);
    } else {
        // 单行或无选择
        const lineStart = input.value.lastIndexOf('\n', start - 1) + 1;
        const beforeCursor = input.value.substring(lineStart, start);

        if (beforeCursor.trim() === '') {
            const replacement = prefix + selectedText;
            input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
            input.setSelectionRange(start + prefix.length, start + replacement.length);
        } else {
            const replacement = '\n' + prefix + selectedText;
            input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
            input.setSelectionRange(start + replacement.length, start + replacement.length);
        }
    }

    finishEdit();
}

function insertQuote() {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);

    if (selectedText.includes('\n')) {
        const lines = selectedText.split('\n');
        const replacement = lines.map(line => line.trim() ? '> ' + line : line).join('\n');
        input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
        input.setSelectionRange(start, start + replacement.length);
    } else {
        const lineStart = input.value.lastIndexOf('\n', start - 1) + 1;
        const beforeCursor = input.value.substring(lineStart, start);

        if (beforeCursor.trim() === '') {
            const replacement = '> ' + selectedText;
            input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
            input.setSelectionRange(start + 2, start + replacement.length);
        } else {
            const replacement = '\n> ' + selectedText;
            input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
            input.setSelectionRange(start + replacement.length, start + replacement.length);
        }
    }

    finishEdit();
}

function insertLink() {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);
    const linkText = selectedText || '链接文字';
    const replacement = `[${linkText}](https://example.com)`;

    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);

    // 选中URL部分方便编辑
    const urlStart = start + linkText.length + 3;
    const urlEnd = urlStart + 'https://example.com'.length;
    input.setSelectionRange(urlStart, urlEnd);

    finishEdit();
}

function insertImage() {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);
    const altText = selectedText || '图片描述';
    const replacement = `![${altText}](https://example.com/image.jpg)`;

    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);

    // 选中URL部分方便编辑
    const urlStart = start + altText.length + 4;
    const urlEnd = urlStart + 'https://example.com/image.jpg'.length;
    input.setSelectionRange(urlStart, urlEnd);

    finishEdit();
}

function insertTable() {
    const replacement = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
`;
    const start = input.selectionStart;
    input.value = input.value.substring(0, start) + replacement + input.value.substring(start);
    input.setSelectionRange(start + replacement.length, start + replacement.length);

    finishEdit();
}

function insertCodeBlock() {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);
    const replacement = `\`\`\`javascript
${selectedText || '// 在这里输入代码'}
\`\`\``;

    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);

    if (!selectedText) {
        // 如果没有选中文字，将光标定位到代码区域
        const codeStart = start + '```javascript\n'.length;
        const codeEnd = codeStart + '// 在这里输入代码'.length;
        input.setSelectionRange(codeStart, codeEnd);
    }

    finishEdit();
}

function insertHorizontalRule() {
    const start = input.selectionStart;
    const end = input.selectionEnd;

    // 检查是否在行首
    const lineStart = input.value.lastIndexOf('\n', start - 1) + 1;
    const beforeCursor = input.value.substring(lineStart, start);

    let replacement;
    if (beforeCursor.trim() === '') {
        // 在行首，直接插入
        replacement = '---';
    } else {
        // 不在行首，换行后插入
        replacement = '\n---';
    }

    // 检查分割线后是否需要换行
    const afterCursor = input.value.substring(end);
    if (afterCursor && !afterCursor.startsWith('\n')) {
        replacement += '\n';
    }

    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);

    // 将光标定位到分割线后
    const newPosition = start + replacement.length;
    input.setSelectionRange(newPosition, newPosition);

    finishEdit();
}

// LaTeX数学公式插入函数
function insertInlineMath() {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);
    const replacement = `$${selectedText || 'E = mc^2'}$`;

    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);

    if (!selectedText) {
        // 如果没有选中文字，将光标定位到公式内部
        const formulaStart = start + 1;
        const formulaEnd = formulaStart + 'E = mc^2'.length;
        input.setSelectionRange(formulaStart, formulaEnd);
    }

    finishEdit();
}

function insertDisplayMath() {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = input.value.substring(start, end);

    // 检查是否在行首
    const lineStart = input.value.lastIndexOf('\n', start - 1) + 1;
    const beforeCursor = input.value.substring(lineStart, start);

    let replacement;
    if (beforeCursor.trim() === '') {
        // 在行首，直接插入
        replacement = `$$\n${selectedText || '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}'}\n$$`;
    } else {
        // 不在行首，换行后插入
        replacement = `\n$$\n${selectedText || '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}'}\n$$`;
    }

    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);

    if (!selectedText) {
        // 如果没有选中文字，将光标定位到公式内部
        const formulaStart = start + replacement.indexOf('\n') + 4; // 找到第一个换行后的$$\n位置
        const defaultFormula = '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}';
        const formulaEnd = formulaStart + defaultFormula.length;
        input.setSelectionRange(formulaStart, formulaEnd);
    }

    finishEdit();
}

// 显示加载提示
function showLoadingToast(message) {
    // 移除已存在的提示
    const existingToast = document.getElementById('loading-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'loading-toast';
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        z-index: 10000;
        font-family: "LXGW WenKai", sans-serif;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
    `;

    toast.innerHTML = `
        <div style="
            width: 20px;
            height: 20px;
            border: 2px solid #ffffff;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        "></div>
        ${message}
    `;

    // 添加旋转动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    return toast;
}

// 隐藏加载提示
function hideLoadingToast() {
    const toast = document.getElementById('loading-toast');
    if (toast) {
        toast.remove();
    }
}

// 获取文件名的通用函数
function getExportFilename() {
    const markdownContent = input.value;
    let filename = 'untitled';

    if (markdownContent.trim()) {
        // 移除Markdown语法，获取纯文本
        const plainText = markdownContent
            .replace(/^#+\s*/gm, '') // 移除标题标记
            .replace(/\*\*(.*?)\*\*/g, '$1') // 移除加粗
            .replace(/\*(.*?)\*/g, '$1') // 移除斜体
            .replace(/`(.*?)`/g, '$1') // 移除行内代码
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接，保留文字
            .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // 移除图片，保留alt文字
            .replace(/>/g, '') // 移除引用标记
            .replace(/[-*+]\s/g, '') // 移除列表标记
            .replace(/\d+\.\s/g, '') // 移除有序列表标记
            .replace(/\n/g, ' ') // 换行替换为空格
            .trim();

        if (plainText) {
            // 取前五个字符，如果不足五个字符就取全部
            filename = plainText.length <= 5 ? plainText : plainText.substring(0, 5);
            // 移除特殊字符，只保留中文、英文、数字
            filename = filename.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
            if (!filename) {
                filename = 'untitled';
            }
        }
    }

    return filename;
}

// 创建用于导出的预览内容副本
function createExportPreview() {
    const previewElement = document.getElementById('preview');
    const exportContainer = document.createElement('div');

    // 复制预览内容
    exportContainer.innerHTML = previewElement.innerHTML;

    // 设置导出样式
    exportContainer.style.cssText = `
        font-family: "LXGW WenKai", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.7;
        color: #444444;
        padding: 40px;
        background: #ffffff;
        max-width: 800px;
        margin: 0 auto;
        box-sizing: border-box;
        word-wrap: break-word;
        overflow-wrap: break-word;
    `;

    // 应用导出专用的样式
    const style = document.createElement('style');
    style.textContent = `
        /* 导出专用样式 - 完全复制网页样式 */
        .export-content h1, .export-content h2, .export-content h3,
        .export-content h4, .export-content h5, .export-content h6 {
            margin: 0.5em 0 0.5em 0;
            color: #555555;
            font-weight: 600;
        }

        /* 第一个元素的特殊处理 */
        .export-content > h1:first-child,
        .export-content > h2:first-child,
        .export-content > h3:first-child,
        .export-content > h4:first-child,
        .export-content > h5:first-child,
        .export-content > h6:first-child,
        .export-content > p:first-child {
            margin-top: 0;
        }

        .export-content h1 {
            font-size: 2.2em;
            border-bottom: 3px solid #aaaaaa;
            padding-bottom: 10px;
        }

        .export-content h2 {
            font-size: 1.8em;
            border-bottom: 2px solid #bbbbbb;
            padding-bottom: 8px;
        }

        .export-content h3 {
            font-size: 1.5em;
            color: #777777;
        }

        .export-content p {
            margin: 0.8em 0;
            text-align: justify;
        }

        .export-content blockquote {
            border-left: 4px solid #3498db;
            margin: 1.5em 0;
            padding: 0.5em 1em;
            background: #ecf0f1;
            font-style: italic;
        }

        .export-content code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 0;
            font-family: 'Consolas', 'Monaco', monospace;
            color: #e74c3c;
            font-size: 0.9em;
        }

        /* 代码块样式 - 与网页完全一致 */
        .export-content .code-block-container {
            position: relative;
            margin: 1.5em 0;
        }

        .export-content .code-block-header {
            background: #f8f9fa;
            color: #495057;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            border-bottom: 1px solid #e9ecef;
        }

        .export-content .code-language {
            font-family: 'Consolas', 'Monaco', monospace;
            color: #6c757d;
            text-transform: uppercase;
            font-weight: 500;
        }

        .export-content pre {
            background: #f8f9fa;
            color: #495057;
            padding: 1.5em;
            border-radius: 0;
            overflow-x: auto;
            margin: 0;
            border: 1px solid #e9ecef;
            border-top: none;
        }

        .export-content pre code {
            background: none;
            color: inherit;
            padding: 0;
        }

        /* 隐藏代码复制按钮 */
        .export-content .code-copy-btn {
            display: none !important;
        }

        /* 列表样式 - 确保使用圆点 */
        .export-content ul, .export-content ol {
            margin: 1em 0;
            padding-left: 2em;
        }

        .export-content ul {
            list-style-type: disc;
        }

        .export-content ol {
            list-style-type: decimal;
        }

        .export-content li {
            margin: 0.5em 0;
        }

        /* 表格样式 */
        .export-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5em 0;
        }

        .export-content th, .export-content td {
            border: 1px solid #bdc3c7;
            padding: 12px;
            text-align: left;
        }

        .export-content th {
            background: #34495e;
            color: white;
            font-weight: 600;
        }

        .export-content tr:nth-child(even) {
            background: #f8f9fa;
        }

        /* 链接样式 */
        .export-content a {
            color: #3498db;
            text-decoration: none;
            border-bottom: 1px solid transparent;
        }

        /* 图片样式 */
        .export-content img {
            max-width: 100%;
            height: auto;
            border-radius: 0;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            margin: 1em 0;
        }

        /* 语法高亮样式 - 使用GitHub主题 */
        .export-content .hljs {
            background: transparent;
            color: #24292e;
        }

        .export-content .hljs-comment,
        .export-content .hljs-quote {
            color: #6a737d;
            font-style: italic;
        }

        .export-content .hljs-keyword,
        .export-content .hljs-selector-tag,
        .export-content .hljs-literal,
        .export-content .hljs-section,
        .export-content .hljs-doctag,
        .export-content .hljs-type,
        .export-content .hljs-name {
            color: #d73a49;
        }

        .export-content .hljs-variable,
        .export-content .hljs-template-variable,
        .export-content .hljs-string,
        .export-content .hljs-addition {
            color: #032f62;
        }

        .export-content .hljs-number,
        .export-content .hljs-built_in,
        .export-content .hljs-builtin-name,
        .export-content .hljs-literal,
        .export-content .hljs-type,
        .export-content .hljs-params {
            color: #005cc5;
        }

        .export-content .hljs-meta,
        .export-content .hljs-meta-keyword {
            color: #e36209;
        }

        .export-content .hljs-title,
        .export-content .hljs-class .hljs-title,
        .export-content .hljs-function .hljs-title {
            color: #6f42c1;
        }

        .export-content .hljs-attr,
        .export-content .hljs-attribute {
            color: #005cc5;
        }

        .export-content .hljs-regexp,
        .export-content .hljs-link {
            color: #032f62;
        }

        .export-content .hljs-symbol,
        .export-content .hljs-bullet {
            color: #e36209;
        }

        .export-content .hljs-deletion {
            color: #b31d28;
            background-color: #ffeef0;
        }

        .export-content .hljs-formula {
            background-color: #eee;
        }

        .export-content .hljs-emphasis {
            font-style: italic;
        }

        .export-content .hljs-strong {
            font-weight: bold;
        }

        /* KaTeX数学公式样式 */
        .export-content .katex {
            font-size: 1.1em;
            color: #444444;
        }

        .export-content .katex-display {
            margin: 1.5em 0;
            text-align: center;
        }

        .export-content .katex-display > .katex {
            display: inline-block;
            white-space: nowrap;
        }
    `;

    exportContainer.className = 'export-content';

    return { container: exportContainer, style: style };
}

// 导出为PNG图片
async function exportToPNG() {
    try {
        // 检查是否有内容
        if (!input.value.trim()) {
            alert('请先输入一些内容再导出');
            return;
        }

        const loadingToast = showLoadingToast('正在生成图片，请稍候...');
        const filename = getExportFilename();
        const { container, style } = createExportPreview();

        // 创建临时容器
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 800px;
            background: white;
            z-index: -1;
        `;

        tempContainer.appendChild(style);
        tempContainer.appendChild(container);
        document.body.appendChild(tempContainer);

        // 重新渲染数学公式
        if (window.renderMathInElement) {
            renderMathInElement(container, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\[', right: '\\]', display: true},
                    {left: '\\(', right: '\\)', display: false}
                ],
                throwOnError: false,
                errorColor: '#cc0000',
                strict: false,
                trust: false,
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
            });
        }

        // 等待字体、样式和数学公式加载
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 使用html2canvas生成图片
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2, // 提高清晰度
            useCORS: true,
            allowTaint: false,
            width: 800,
            height: container.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            logging: false
        });

        // 清理临时容器
        document.body.removeChild(tempContainer);

        // 下载图片
        const link = document.createElement('a');
        link.download = filename + '.png';
        link.href = canvas.toDataURL('image/png', 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        hideLoadingToast();
        console.log('PNG导出成功');

    } catch (error) {
        hideLoadingToast();
        console.error('导出PNG失败:', error);
        alert('导出图片失败，请重试。错误信息：' + error.message);
    }
}

// 导出为PDF
async function exportToPDF() {
    try {
        // 检查是否有内容
        if (!input.value.trim()) {
            alert('请先输入一些内容再导出');
            return;
        }

        const loadingToast = showLoadingToast('正在生成PDF，请稍候...');
        const filename = getExportFilename();
        const { container, style } = createExportPreview();

        // 创建临时容器
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 800px;
            background: white;
            z-index: -1;
        `;

        tempContainer.appendChild(style);
        tempContainer.appendChild(container);
        document.body.appendChild(tempContainer);

        // 重新渲染数学公式
        if (window.renderMathInElement) {
            renderMathInElement(container, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\[', right: '\\]', display: true},
                    {left: '\\(', right: '\\)', display: false}
                ],
                throwOnError: false,
                errorColor: '#cc0000',
                strict: false,
                trust: false,
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
            });
        }

        // 等待字体、样式和数学公式加载
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 使用html2canvas生成图片
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2, // 提高清晰度
            useCORS: true,
            allowTaint: false,
            width: 800,
            height: container.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            logging: false
        });

        // 清理临时容器
        document.body.removeChild(tempContainer);

        // 创建PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // 计算图片在PDF中的尺寸
        const imgWidth = 190; // A4宽度减去边距(mm)
        const pageHeight = 277; // A4高度减去边距(mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 10; // 顶部边距

        // 添加第一页
        pdf.addImage(canvas.toDataURL('image/png', 0.95), 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // 如果内容超过一页，添加更多页面
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/png', 0.95), 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // 下载PDF
        pdf.save(filename + '.pdf');

        hideLoadingToast();
        console.log('PDF导出成功');

    } catch (error) {
        hideLoadingToast();
        console.error('导出PDF失败:', error);
        alert('导出PDF失败，请重试。错误信息：' + error.message);
    }
}
