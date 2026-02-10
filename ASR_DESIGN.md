# 语音转文字（ASR）功能设计文档

## 功能概述

为 video-content-extractor 项目添加完整的语音转文字（ASR）功能，实现从视频中提取说话人的完整语音文字稿，而不仅仅是视频的标题和描述。

## 核心需求

1. **视频下载**：已实现，需确保稳定性
2. **音频提取**：从下载的视频文件中提取音频轨道
3. **语音识别**：使用 Manus 内置的语音转录服务将音频转为文字
4. **文字展示**：在前端界面新增"视频文案"区域展示完整语音文字稿
5. **摘要优化**：基于语音文字稿生成更准确的内容摘要

## 技术架构

### 后端改造

#### 1. 音频提取模块（videoProcessor.ts）

新增函数：
```typescript
/**
 * 从视频文件中提取音频
 * @param videoPath 视频文件路径
 * @param analysisId 分析任务 ID
 * @returns 音频文件路径
 */
export async function extractAudioFromVideo(
  videoPath: string, 
  analysisId: number
): Promise<string>
```

实现方式：
- 使用 FFmpeg 提取音频：`ffmpeg -i video.mp4 -vn -acodec libmp3lame -q:a 2 audio.mp3`
- 输出格式：MP3（兼容性好，文件小）
- 采样率：16kHz（语音识别推荐）
- 声道：单声道（减小文件大小）

#### 2. 语音转录模块

新增函数：
```typescript
/**
 * 使用 Manus 语音转录服务转录音频
 * @param audioPath 音频文件路径
 * @returns 转录文字
 */
export async function transcribeAudio(audioPath: string): Promise<string>
```

实现方式：
- 使用 Manus 内置的 `voiceTranscription` 服务
- 从 `server/_core/voiceTranscription.ts` 导入 `transcribeAudio` 函数
- 支持中英文混合识别

#### 3. 数据库架构扩展（drizzle/schema.ts）

新增字段：
```typescript
transcript: text('transcript'), // 语音转录文字稿
transcriptLanguage: varchar('transcript_language', { length: 10 }), // 识别语言
```

#### 4. 处理流程优化（routers.ts）

更新 `processVideoAnalysis` 函数流程：

```
1. 获取视频元数据（TikHub API）         [10%]
2. 下载视频文件                        [20%]
3. 提取音频                            [30%]
4. 语音转录（ASR）                     [50%]
5. 提取关键帧                          [60%]
6. OCR 文字识别                        [70%]
7. AI 画面分析                         [85%]
8. 生成内容摘要（基于语音文字稿）      [95%]
9. 完成                                [100%]
```

### 前端改造

#### 1. 数据库类型更新（shared/types.ts）

添加新字段：
```typescript
interface VideoAnalysis {
  // ... 现有字段
  transcript?: string | null;
  transcriptLanguage?: string | null;
}
```

#### 2. 分析详情页面（AnalysisDetail.tsx）

新增"视频文案"卡片：
```tsx
{/* Video Transcript */}
{analysis.transcript && (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="w-5 h-5" />
        视频文案
      </CardTitle>
      <CardDescription>
        从视频语音中提取的完整文字稿
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {analysis.transcript}
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

展示顺序：
1. 分析状态
2. 视频信息
3. **视频文案**（新增）
4. 内容摘要
5. 画面分析
6. OCR 文字识别

#### 3. 内容摘要优化

更新 `generateContentSummary` 函数，优先使用语音文字稿：
```typescript
const prompt = `请基于以下视频信息生成内容摘要和关键要点：

视频标题：${videoMetadata.title || '未知'}
视频描述：${videoMetadata.description || '无'}

语音文字稿：
${transcript || '无语音识别'}

画面分析：
${frameAnalysis.map(...).join('\n\n')}

画面文字（OCR）：
${ocrText || '无文字识别'}

请生成：
1. 一段200字以内的内容摘要
2. 3-5个关键要点
`;
```

## 平台 API 问题修复

### 1. B 站视频下载问题

**问题**：B 站 API 返回的视频 URL 可能需要特殊处理

**解决方案**：
- 检查 TikHub API 返回的 B 站数据结构
- 添加 B 站专用的视频下载逻辑
- 处理分段视频（durl）和 DASH 格式

### 2. 小红书 API 400 错误

**问题**：小红书 API 参数或认证问题

**解决方案**：
- 检查 API 端点和参数格式
- 添加错误日志记录详细信息
- 尝试不同的 API 版本或端点

### 3. 抖音语音文字提取

**问题**：当前只能获取标题描述

**解决方案**：
- 通过 ASR 功能从视频音频中提取语音文字
- 不依赖平台 API 提供的字幕数据

## 实现优先级

### P0（核心功能）
1. ✅ 音频提取功能
2. ✅ 语音转录集成
3. ✅ 数据库字段扩展
4. ✅ 前端展示"视频文案"
5. ✅ 处理流程优化

### P1（体验优化）
1. ✅ 内容摘要优化（基于语音文字稿）
2. ✅ 进度条细化
3. ✅ 错误处理增强

### P2（问题修复）
1. 🔧 B 站视频下载修复
2. 🔧 小红书 API 修复
3. 🔧 错误日志优化

## 测试计划

### 功能测试
1. 抖音短视频（< 1 分钟）
2. B 站中等视频（1-5 分钟）
3. 小红书视频笔记
4. 无语音视频（纯音乐/静音）
5. 多语言视频（中英混合）

### 边界测试
1. 超长视频（> 10 分钟）
2. 低质量音频
3. 背景噪音大的视频
4. 多人对话视频

## 性能考虑

### 处理时间估算
- 音频提取：5-10 秒
- 语音转录：视频时长 × 0.3（例如 1 分钟视频约 20 秒）
- 总增加时间：约 15-30 秒

### 成本优化
- 语音转录按时长计费
- 建议对相同视频进行缓存
- 可选：允许用户跳过 ASR 功能

## 后续扩展

1. **字幕时间轴**：返回带时间戳的字幕数据
2. **多语言支持**：自动检测语言并选择对应模型
3. **说话人分离**：识别多个说话人
4. **关键词提取**：从文字稿中提取关键词
5. **情感分析**：分析语音的情感倾向
