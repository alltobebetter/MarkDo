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

    // 设置所有链接在新标签页打开
    const links = preview.querySelectorAll('a[href]');
    links.forEach(link => {
        // 只处理外部链接，内部锚点链接保持原样
        if (link.getAttribute('href').startsWith('http') ||
            link.getAttribute('href').startsWith('//') ||
            link.getAttribute('href').startsWith('www.')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });

    // 重新初始化新添加的图标
    lucide.createIcons();

    // 更新滚动映射
    updateScrollMapping();
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



// 监听输入变化
input.addEventListener('input', function() {
    updatePreview();
    updateWordCount();
    saveContent();
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



// 快捷键支持
document.addEventListener('keydown', function(e) {
    // 全屏 F11
    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }

    // ESC键关闭弹窗
    if (e.key === 'Escape') {
        hideConfirmModal();
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
    // 记录用户尝试安装PWA的意图
    localStorage.setItem('pwa-install-attempted', 'true');

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

    // 记录用户关闭了安装弹窗（可能表示不感兴趣）
    localStorage.setItem('pwa-install-dismissed', 'true');
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

// 检查是否为PWA环境
function isPWAEnvironment() {
    // 检查是否在独立模式下运行（已安装的PWA）
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
}

// 检查用户是否有PWA安装意图
function hasUserPWAIntent() {
    // 检查用户是否曾经与PWA安装功能交互过
    return localStorage.getItem('pwa-install-attempted') === 'true' ||
           localStorage.getItem('pwa-install-dismissed') === 'true' ||
           isPWAEnvironment();
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
                        // 只有在PWA环境或用户有PWA使用意图时才显示更新提示
                        if (isPWAEnvironment() || hasUserPWAIntent()) {
                            showUpdateAvailableToast();
                        } else {
                            console.log('PWA: 新版本已缓存，但用户未使用PWA模式，不显示更新提示');
                        }
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

// 精准滚动同步功能
let isScrolling = false;
let lineMapping = new Map(); // 存储行号到预览元素的映射

// 计算行号到预览元素的映射关系
function calculateLineMapping() {
    const content = input.value;
    const lines = content.split('\n');
    const previewElements = preview.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, pre, ul, ol, table, hr, .katex-display');

    lineMapping.clear();

    let elementIndex = 0;
    let inCodeBlock = false;
    let inMathBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prevLine = i > 0 ? lines[i - 1] : '';
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

        // 处理代码块状态
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            if (!inCodeBlock && elementIndex < previewElements.length) {
                // 代码块结束，映射到pre元素
                const element = previewElements[elementIndex];
                if (element.tagName === 'PRE' || element.classList.contains('code-block-container')) {
                    lineMapping.set(i - getCodeBlockLength(lines, i), {
                        element: element,
                        offsetTop: element.offsetTop,
                        lineNumber: i - getCodeBlockLength(lines, i)
                    });
                    elementIndex++;
                }
            }
            continue;
        }

        // 处理数学公式块状态
        if (line.trim() === '$$') {
            inMathBlock = !inMathBlock;
            if (!inMathBlock && elementIndex < previewElements.length) {
                // 数学公式块结束
                const element = previewElements[elementIndex];
                if (element.classList.contains('katex-display')) {
                    lineMapping.set(i - getMathBlockLength(lines, i), {
                        element: element,
                        offsetTop: element.offsetTop,
                        lineNumber: i - getMathBlockLength(lines, i)
                    });
                    elementIndex++;
                }
            }
            continue;
        }

        // 跳过代码块和数学公式块内部的行
        if (inCodeBlock || inMathBlock) continue;

        // 检查是否是Markdown元素的开始
        if (isMarkdownElement(line, prevLine, nextLine)) {
            if (elementIndex < previewElements.length) {
                const element = previewElements[elementIndex];
                lineMapping.set(i, {
                    element: element,
                    offsetTop: element.offsetTop,
                    lineNumber: i
                });
                elementIndex++;
            }
        }
    }
}

// 获取代码块的长度
function getCodeBlockLength(lines, endIndex) {
    let length = 0;
    for (let i = endIndex - 1; i >= 0; i--) {
        length++;
        if (lines[i].trim().startsWith('```')) {
            break;
        }
    }
    return length - 1;
}

// 获取数学公式块的长度
function getMathBlockLength(lines, endIndex) {
    let length = 0;
    for (let i = endIndex - 1; i >= 0; i--) {
        length++;
        if (lines[i].trim() === '$$') {
            break;
        }
    }
    return length - 1;
}

// 判断是否是Markdown元素
function isMarkdownElement(line, prevLine = '', nextLine = '') {
    const trimmed = line.trim();

    // 空行不是元素
    if (!trimmed) return false;

    // 标题
    if (/^#{1,6}\s/.test(trimmed)) return true;

    // 代码块开始/结束
    if (trimmed.startsWith('```')) return true;

    // 表格行
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) return true;

    // 引用
    if (trimmed.startsWith('>')) return true;

    // 列表项
    if (/^[-*+]\s/.test(trimmed)) return true;
    if (/^\d+\.\s/.test(trimmed)) return true;

    // 分割线
    if (/^[-*_]{3,}$/.test(trimmed)) return true;

    // 数学公式块
    if (trimmed === '$$') return true;

    // 普通段落（前后有空行或文档开始/结束）
    const isParagraph = trimmed.length > 0 &&
                       !trimmed.startsWith('#') &&
                       !trimmed.startsWith('```') &&
                       !trimmed.startsWith('|') &&
                       !trimmed.startsWith('>') &&
                       !/^[-*+]\s/.test(trimmed) &&
                       !/^\d+\.\s/.test(trimmed);

    if (isParagraph) {
        // 检查是否是新段落的开始
        return !prevLine.trim() || prevLine.trim().startsWith('#') ||
               prevLine.trim().startsWith('```') || prevLine.trim() === '$$';
    }

    return false;
}

// 动态计算编辑器行高
function getEditorLineHeight() {
    const style = window.getComputedStyle(input);
    const lineHeight = parseInt(style.lineHeight);
    const fontSize = parseInt(style.fontSize);
    return lineHeight || fontSize * 1.4; // 如果没有设置line-height，使用font-size的1.4倍
}

// 根据编辑器滚动位置计算对应的预览位置
function getPreviewScrollPosition(editorScrollTop) {
    const lineHeight = getEditorLineHeight();
    const currentLine = Math.floor(editorScrollTop / lineHeight);

    // 找到最接近的映射行
    let targetElement = null;
    let closestLine = -1;
    let nextElement = null;
    let nextLine = Infinity;

    for (let [lineNum, mapping] of lineMapping) {
        if (lineNum <= currentLine && lineNum > closestLine) {
            closestLine = lineNum;
            targetElement = mapping;
        }
        if (lineNum > currentLine && lineNum < nextLine) {
            nextLine = lineNum;
            nextElement = mapping;
        }
    }

    if (targetElement) {
        let targetY = targetElement.offsetTop;

        // 如果有下一个元素，进行插值计算
        if (nextElement && nextLine !== Infinity) {
            const lineProgress = (currentLine - closestLine) / (nextLine - closestLine);
            const heightDiff = nextElement.offsetTop - targetElement.offsetTop;
            targetY += heightDiff * lineProgress;
        } else {
            // 没有下一个元素时，使用行偏移
            const lineOffset = currentLine - closestLine;
            const estimatedPixelOffset = lineOffset * (lineHeight * 0.6); // 调整系数
            targetY += estimatedPixelOffset;
        }

        // 调整到视口中心偏上的位置
        return Math.max(0, targetY - preview.clientHeight * 0.25);
    }

    // 回退到百分比对齐
    const scrollPercentage = editorScrollTop / Math.max(1, input.scrollHeight - input.clientHeight);
    return scrollPercentage * Math.max(0, preview.scrollHeight - preview.clientHeight);
}

// 根据预览滚动位置计算对应的编辑器位置
function getEditorScrollPosition(previewScrollTop) {
    const targetY = previewScrollTop + preview.clientHeight * 0.25;
    const lineHeight = getEditorLineHeight();

    // 找到最接近的预览元素
    let targetMapping = null;
    let nextMapping = null;
    let minDistance = Infinity;

    // 按offsetTop排序的映射数组
    const sortedMappings = Array.from(lineMapping.entries())
        .sort((a, b) => a[1].offsetTop - b[1].offsetTop);

    for (let i = 0; i < sortedMappings.length; i++) {
        const [lineNum, mapping] = sortedMappings[i];
        const distance = Math.abs(mapping.offsetTop - targetY);

        if (mapping.offsetTop <= targetY) {
            targetMapping = { lineNum, mapping };
            if (i + 1 < sortedMappings.length) {
                const [nextLineNum, nextMappingData] = sortedMappings[i + 1];
                nextMapping = { lineNum: nextLineNum, mapping: nextMappingData };
            }
        } else {
            break;
        }
    }

    if (targetMapping) {
        let targetLine = targetMapping.lineNum;

        // 如果有下一个元素，进行插值计算
        if (nextMapping) {
            const currentY = targetMapping.mapping.offsetTop;
            const nextY = nextMapping.mapping.offsetTop;
            const progress = (targetY - currentY) / (nextY - currentY);

            if (progress >= 0 && progress <= 1) {
                const lineDiff = nextMapping.lineNum - targetMapping.lineNum;
                targetLine += lineDiff * progress;
            }
        } else {
            // 没有下一个元素时，使用像素偏移估算
            const pixelOffset = targetY - targetMapping.mapping.offsetTop;
            const estimatedLineOffset = pixelOffset / (lineHeight * 0.6);
            targetLine += estimatedLineOffset;
        }

        return Math.max(0, targetLine * lineHeight);
    }

    // 回退到百分比对齐
    const scrollPercentage = previewScrollTop / Math.max(1, preview.scrollHeight - preview.clientHeight);
    return scrollPercentage * Math.max(0, input.scrollHeight - input.clientHeight);
}

// 编辑器滚动事件
input.addEventListener('scroll', function() {
    if (isScrolling) return;
    isScrolling = true;

    const targetScrollTop = getPreviewScrollPosition(input.scrollTop);
    preview.scrollTop = targetScrollTop;

    setTimeout(() => { isScrolling = false; }, 50);
});

// 预览区滚动事件
preview.addEventListener('scroll', function() {
    if (isScrolling) return;
    isScrolling = true;

    const targetScrollTop = getEditorScrollPosition(preview.scrollTop);
    input.scrollTop = targetScrollTop;

    setTimeout(() => { isScrolling = false; }, 50);
});

// 在内容更新时重新计算映射
function updateScrollMapping() {
    // 延迟计算，确保DOM已更新
    setTimeout(() => {
        calculateLineMapping();
    }, 100);
}

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
