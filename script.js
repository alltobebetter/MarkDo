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

// 监听输入变化
input.addEventListener('input', function() {
    updatePreview();
    saveContent();
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

// 定期自动保存（每30秒）
setInterval(saveContent, 30000);

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

    // 获取文件名：取文章前五个字符
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
