# SnapWord

一款 Chrome 扩展，让你在任意网页上框选英文区域，即可通过 OCR 识别文字，并由 Claude AI 即时返回简体中文翻译、词性及例句。

## 功能

- 框选网页任意区域 → 自动 OCR 识别英文
- Claude AI 返回简体中文翻译、词性、英文例句及中文例句
- 悬浮气泡显示结果，支持一键保存
- 单字本管理：置顶、删除、按日期 / 字母 / 随机排序

## 安装

> 无需构建，直接加载源码即可。

1. 打开 `chrome://extensions`
2. 开启右上角的**开发者模式**
3. 点击**加载已解压的扩展程序** → 选择本项目文件夹
4. 点击扩展图标 → **Settings**，填入你的 [Anthropic API Key](https://console.anthropic.com/)

## 使用方法

| 操作 | 说明 |
|------|------|
| `Cmd+Shift+O` / `Ctrl+Shift+O` | 进入框选模式 |
| 拖拽鼠标 | 框选要识别的英文区域 |
| `Esc` | 取消框选 |
| 气泡中的 **Save** | 将单词保存到单字本 |
| 扩展图标 → **Word List** | 查看已保存的单字本 |

## 依赖

- [Tesseract.js](https://github.com/naptha/tesseract.js) — 浏览器端 OCR
- [Claude API](https://www.anthropic.com/) — AI 翻译（需自备 API Key）

## 开发说明

修改代码后，在 `chrome://extensions` 页面点击扩展卡片上的**重新加载**按钮即可生效。
