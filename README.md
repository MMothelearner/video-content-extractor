# 视频内容分析工具

一个强大的 AI 驱动的视频内容分析工具，支持从 20+ 主流视频平台提取视频链接，自动分析视频文案与画面信息，生成结构化的分析报告。

## 核心功能

### 1. 多平台支持

支持以下主流视频平台的视频链接解析和内容提取：

- **国内平台**：抖音、快手、小红书、哔哩哔哩、微博视频
- **国际平台**：TikTok、YouTube、Instagram、Twitter
- **其他平台**：通过 TikHub API 支持 20+ 视频平台

### 2. 视频文案提取

自动提取视频的结构化文本信息：

- **基本信息**：标题、描述、作者、发布时间
- **互动数据**：播放量、点赞数、评论数、分享数
- **内容标签**：话题标签（Hashtags）、分类信息
- **视频元数据**：时长、分辨率、封面图

### 3. 画面内容分析

使用先进的计算机视觉和 AI 技术分析视频画面：

- **关键帧提取**：自动提取 6 个代表性关键帧
- **OCR 文字识别**：识别画面中的中英文文字内容
- **AI 画面分析**：
  - 场景识别（室内/室外、环境类型）
  - 物体检测（主要物品、人物）
  - 画面描述（整体氛围、风格特征）

### 4. 智能内容摘要

基于多模态信息生成综合分析报告：

- **内容摘要**：200 字以内的核心内容概括
- **关键要点**：3-5 个结构化的关键信息点
- **信息整合**：融合文案、画面、文字识别的综合分析

### 5. 历史记录管理

- 保存所有分析历史记录
- 支持快速查看和重新访问
- 按时间排序的分析列表

## 技术架构

### 后端技术栈

- **框架**：Express + tRPC（类型安全的 API）
- **数据库**：MySQL/TiDB（Drizzle ORM）
- **视频处理**：FFmpeg（关键帧提取）
- **OCR 引擎**：Tesseract（支持中英文识别）
- **AI 服务**：
  - Manus LLM（多模态视频分析）
  - TikHub API（视频数据获取）
- **存储服务**：S3（关键帧图片存储）

### 前端技术栈

- **框架**：React 19 + TypeScript
- **UI 组件**：shadcn/ui + Tailwind CSS 4
- **路由**：Wouter（轻量级路由）
- **状态管理**：tRPC React Query
- **表单处理**：React Hook Form + Zod

### 核心流程

```
用户输入视频链接
    ↓
平台识别 & URL 解析
    ↓
调用 TikHub API 获取视频元数据
    ↓
下载视频文件
    ↓
提取关键帧（6 帧）
    ↓
并行处理：
├─ OCR 文字识别
└─ AI 画面分析（场景、物体、描述）
    ↓
生成内容摘要和关键要点
    ↓
保存到数据库 & 展示结果
```

## 使用指南

### 1. 开始分析

1. 在首页输入框中粘贴视频链接
2. 点击"开始分析"按钮
3. 系统会自动识别平台并开始处理

**支持的链接格式示例**：

```
抖音：https://www.douyin.com/video/7448118827402972455
TikTok：https://www.tiktok.com/@username/video/1234567890
YouTube：https://www.youtube.com/watch?v=dQw4w9WgXcQ
小红书：https://www.xiaohongshu.com/explore/123456
B站：https://www.bilibili.com/video/BV1234567890
```

### 2. 查看分析进度

- 分析页面会实时显示当前进度（0-100%）
- 处理状态包括：
  - **等待中**：任务已创建，等待处理
  - **下载视频中**：正在从平台下载视频
  - **提取关键帧中**：正在提取代表性画面
  - **AI 分析中**：正在进行画面内容分析
  - **已完成**：分析完成，可查看结果
  - **失败**：分析失败，查看错误信息

### 3. 查看分析结果

分析完成后，结果页面会展示：

#### 视频信息卡片
- 视频封面
- 标题和描述
- 作者信息
- 播放量、点赞数等互动数据
- 话题标签

#### 内容摘要卡片
- AI 生成的内容摘要（200 字以内）
- 3-5 个关键要点

#### 画面分析卡片
- 6 个关键帧截图
- 每帧的时间戳
- 场景描述
- 识别的物体和人物
- 画面详细描述

#### OCR 文字识别卡片
- 从视频画面中识别的所有文字
- 按时间戳组织

### 4. 历史记录

- 点击顶部导航的"历史记录"查看所有分析
- 点击任意记录可重新查看详细结果
- 历史记录按创建时间倒序排列

## 环境变量配置

系统需要以下环境变量（已自动配置）：

```bash
# TikHub API
TIKHUB_API_TOKEN=your_tikhub_token

# 数据库
DATABASE_URL=mysql://...

# Manus 内置服务（自动注入）
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...

# OAuth（自动注入）
VITE_APP_ID=...
OAUTH_SERVER_URL=...
JWT_SECRET=...
```

## 开发指南

### 本地开发

```bash
# 安装依赖
pnpm install

# 推送数据库架构
pnpm db:push

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 类型检查
pnpm check
```

### 项目结构

```
video-content-extractor/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── Home.tsx           # 首页
│   │   │   ├── AnalysisDetail.tsx # 分析详情页
│   │   │   └── History.tsx        # 历史记录页
│   │   ├── components/    # UI 组件
│   │   ├── lib/           # 工具库
│   │   └── App.tsx        # 应用入口
├── server/                # 后端代码
│   ├── routers.ts         # tRPC 路由
│   ├── db.ts              # 数据库查询
│   ├── tikhub.ts          # TikHub API 集成
│   ├── videoProcessor.ts  # 视频处理逻辑
│   └── storage.ts         # S3 存储服务
├── drizzle/               # 数据库架构
│   └── schema.ts          # 表定义
└── package.json
```

### 数据库架构

#### videoAnalyses 表

存储视频分析记录和结果：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| userId | INT | 用户 ID |
| videoUrl | VARCHAR | 视频链接 |
| platform | VARCHAR | 平台名称 |
| status | ENUM | 分析状态 |
| progress | INT | 进度百分比 |
| title | TEXT | 视频标题 |
| description | TEXT | 视频描述 |
| author | VARCHAR | 作者名称 |
| coverUrl | TEXT | 封面图 URL |
| playUrl | TEXT | 播放地址 |
| duration | INT | 视频时长（秒） |
| hashtags | JSON | 话题标签数组 |
| viewCount | INT | 播放量 |
| likeCount | INT | 点赞数 |
| commentCount | INT | 评论数 |
| shareCount | INT | 分享数 |
| ocrText | TEXT | OCR 识别文字 |
| frameAnalysis | JSON | 关键帧分析结果 |
| contentSummary | TEXT | 内容摘要 |
| keyPoints | JSON | 关键要点数组 |
| errorMessage | TEXT | 错误信息 |
| completedAt | TIMESTAMP | 完成时间 |

### API 路由

#### `video.analyze`

创建视频分析任务

**输入**：
```typescript
{
  videoUrl: string; // 视频链接
}
```

**输出**：
```typescript
{
  analysisId: number; // 分析任务 ID
}
```

#### `video.getAnalysis`

获取分析结果

**输入**：
```typescript
{
  analysisId: number; // 分析任务 ID
}
```

**输出**：
```typescript
{
  id: number;
  status: string;
  progress: number;
  title: string;
  description: string;
  // ... 其他字段
}
```

#### `video.getHistory`

获取用户的分析历史

**输入**：无

**输出**：
```typescript
Array<{
  id: number;
  videoUrl: string;
  platform: string;
  status: string;
  title: string;
  // ... 其他字段
}>
```

## 注意事项

### 1. 视频下载限制

- 单个视频最大支持 500MB
- 下载超时时间为 2 分钟
- 某些平台可能有访问限制

### 2. 处理时间

典型的分析时间取决于视频长度：

- **短视频（< 1 分钟）**：约 30-60 秒
- **中等视频（1-5 分钟）**：约 1-3 分钟
- **长视频（> 5 分钟）**：约 3-5 分钟

主要耗时环节：
- 视频下载：10-30 秒
- 关键帧提取：5-10 秒
- OCR 识别：10-20 秒
- AI 画面分析：30-60 秒（每帧 5-10 秒）
- 内容摘要生成：10-15 秒

### 3. 成本考虑

- **TikHub API**：按调用次数计费
- **Manus LLM**：按 token 使用量计费
- **S3 存储**：按存储空间和流量计费

建议：
- 合理控制分析频率
- 定期清理过期的关键帧图片
- 对于相同视频避免重复分析

### 4. 隐私和安全

- 所有视频文件仅临时存储，分析完成后自动删除
- 关键帧图片存储在私有 S3 桶中
- 用户只能访问自己的分析记录
- 不会永久保存视频文件

## 常见问题

### Q: 支持哪些视频平台？

A: 目前通过 TikHub API 支持 20+ 主流平台，包括抖音、TikTok、YouTube、小红书、B站、快手、微博、Instagram、Twitter 等。具体支持列表请参考 TikHub API 文档。

### Q: 分析失败怎么办？

A: 常见失败原因：
1. **视频链接无效**：确保链接可以正常访问
2. **平台限制**：某些平台可能有地区或访问限制
3. **视频过大**：超过 500MB 的视频无法处理
4. **网络问题**：下载超时或网络不稳定

### Q: OCR 识别准确率如何？

A: Tesseract OCR 对清晰的印刷体文字识别准确率较高（> 90%），但对以下情况可能识别不准：
- 手写文字
- 艺术字体
- 低分辨率或模糊的文字
- 复杂背景上的文字

### Q: AI 分析的准确性？

A: AI 画面分析基于先进的多模态大语言模型，对常见场景和物体的识别准确率较高。但可能在以下情况下出现偏差：
- 抽象或艺术化的画面
- 特殊领域的专业内容
- 快速变化的动态场景

### Q: 如何导出分析结果？

A: 当前版本暂不支持导出功能，计划在未来版本中添加 PDF/JSON 导出功能。

## 技术支持

如有问题或建议，请通过以下方式联系：

- **项目地址**：https://manus.space
- **技术文档**：https://help.manus.im
- **反馈渠道**：项目管理界面

## 许可证

MIT License

---

**Powered by TikHub API & Manus AI**

*最后更新：2026-02-06*
