import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import axios from 'axios';
import { invokeLLM } from './_core/llm';
import { storagePut } from './storage';
import { readFile } from 'fs/promises';
import { transcribeAudio } from './_core/voiceTranscription';
import { storagePut as uploadFile } from './storage';

const execAsync = promisify(exec);

const TEMP_DIR = '/tmp/video-analysis';
const FRAMES_PER_VIDEO = 6; // Extract 6 key frames

/**
 * Ensure temp directory exists
 */
async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

/**
 * Download video from URL
 */
export async function downloadVideo(videoUrl: string, analysisId: number): Promise<string> {
  await ensureTempDir();
  
  const videoPath = path.join(TEMP_DIR, `video_${analysisId}.mp4`);
  
  // Validate URL
  if (!videoUrl || videoUrl.trim() === '') {
    throw new Error('Video URL is empty. The platform API may not have returned a valid download URL.');
  }
  
  console.log(`[VideoProcessor] Downloading video from: ${videoUrl}`);
  
  // Try download with retries
  const maxRetries = 2;
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[VideoProcessor] Download attempt ${attempt}/${maxRetries}`);
      
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minutes timeout
        maxContentLength: 500 * 1024 * 1024, // 500MB max
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': videoUrl,
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        },
      });
      
      const buffer = Buffer.from(response.data);
      console.log(`[VideoProcessor] Downloaded ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      if (buffer.length < 1024) {
        throw new Error('Downloaded file is too small, possibly invalid');
      }
      
      await writeFile(videoPath, buffer);
      console.log(`[VideoProcessor] Video saved to: ${videoPath}`);
      return videoPath;
      
    } catch (error: any) {
      lastError = error;
      console.error(`[VideoProcessor] Download attempt ${attempt} failed:`, error.message || error);
      
      if (error.response) {
        console.error('[VideoProcessor] Response status:', error.response.status);
        console.error('[VideoProcessor] Response headers:', error.response.headers);
        
        // Don't retry on 4xx errors (client errors)
        if (error.response.status >= 400 && error.response.status < 500) {
          break;
        }
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // 2s, 4s
        console.log(`[VideoProcessor] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  const errorMsg = lastError?.response?.status 
    ? `HTTP ${lastError.response.status}: ${lastError.message}` 
    : lastError?.message || 'Unknown error';
  throw new Error(`Failed to download video after ${maxRetries} attempts: ${errorMsg}`);
}

/**
 * Extract audio from video file
 */
export async function extractAudioFromVideo(videoPath: string, analysisId: number): Promise<string> {
  await ensureTempDir();
  
  const audioPath = path.join(TEMP_DIR, `audio_${analysisId}.mp3`);
  
  try {
    console.log(`[VideoProcessor] Extracting audio from: ${videoPath}`);
    
    // Extract audio using FFmpeg
    // -vn: no video
    // -acodec libmp3lame: use MP3 codec
    // -ar 16000: 16kHz sample rate (optimal for speech recognition)
    // -ac 1: mono channel
    // -q:a 2: quality level 2 (good quality, small file)
    await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -q:a 2 "${audioPath}" -y`,
      { timeout: 60000 } // 1 minute timeout
    );
    
    if (!existsSync(audioPath)) {
      throw new Error('Audio extraction failed - output file not created');
    }
    
    console.log(`[VideoProcessor] Audio extracted to: ${audioPath}`);
    return audioPath;
  } catch (error: any) {
    console.error('[VideoProcessor] Audio extraction error:', error.message || error);
    throw new Error(`Failed to extract audio: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Transcribe audio to text using Manus voice transcription service
 */
export async function transcribeVideoAudio(audioPath: string): Promise<{ text: string; language: string }> {
  try {
    console.log(`[VideoProcessor] Starting audio transcription: ${audioPath}`);
    
    // Upload audio file to S3 to get a URL
    const audioBuffer = await readFile(audioPath);
    const audioKey = `video-analysis/temp/${path.basename(audioPath)}`;
    const uploadResult = await uploadFile(audioKey, audioBuffer, 'audio/mpeg');
    
    console.log(`[VideoProcessor] Audio uploaded to: ${uploadResult.url}`);
    
    // Transcribe using Manus service
    const transcriptionResult = await transcribeAudio({
      audioUrl: uploadResult.url,
      language: 'zh', // Default to Chinese, service will auto-detect
    });
    
    // Check if transcription failed
    if ('error' in transcriptionResult) {
      console.error('[VideoProcessor] Transcription error:', transcriptionResult);
      throw new Error(transcriptionResult.error);
    }
    
    console.log(`[VideoProcessor] Transcription completed. Language: ${transcriptionResult.language}, Length: ${transcriptionResult.text.length} chars`);
    
    return {
      text: transcriptionResult.text,
      language: transcriptionResult.language,
    };
  } catch (error: any) {
    console.error('[VideoProcessor] Audio transcription error:', error.message || error);
    throw new Error(`Failed to transcribe audio: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string, metadataDuration?: number): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const duration = parseFloat(stdout.trim());
    
    if (duration > 0) {
      console.log(`[VideoProcessor] Video duration from ffprobe: ${duration}s`);
      return duration;
    }
    
    // If ffprobe returns 0 or invalid, try to use metadata duration
    if (metadataDuration && metadataDuration > 0) {
      console.log(`[VideoProcessor] Using metadata duration as fallback: ${metadataDuration}s`);
      return metadataDuration;
    }
    
    console.warn('[VideoProcessor] Could not determine video duration');
    return 0;
  } catch (error) {
    console.error('[VideoProcessor] Failed to get video duration:', error);
    
    // Fallback to metadata duration if provided
    if (metadataDuration && metadataDuration > 0) {
      console.log(`[VideoProcessor] Using metadata duration after error: ${metadataDuration}s`);
      return metadataDuration;
    }
    
    return 0;
  }
}

/**
 * Extract key frames from video
 */
export async function extractKeyFrames(videoPath: string, analysisId: number, metadataDuration?: number): Promise<Array<{ timestamp: number; path: string }>> {
  await ensureTempDir();
  
  const duration = await getVideoDuration(videoPath, metadataDuration);
  if (duration <= 0) {
    console.error('[VideoProcessor] Invalid video duration, cannot extract frames');
    throw new Error('Invalid video duration. Please check if the video file is valid and complete.');
  }
  
  const frames: Array<{ timestamp: number; path: string }> = [];
  const interval = duration / (FRAMES_PER_VIDEO + 1);
  
  for (let i = 1; i <= FRAMES_PER_VIDEO; i++) {
    const timestamp = interval * i;
    const framePath = path.join(TEMP_DIR, `frame_${analysisId}_${i}.jpg`);
    
    try {
      await execAsync(
        `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y`,
        { timeout: 30000 }
      );
      
      frames.push({ timestamp, path: framePath });
    } catch (error) {
      console.error(`[VideoProcessor] Failed to extract frame at ${timestamp}s:`, error);
    }
  }
  
  return frames;
}

/**
 * Perform OCR on an image using Tesseract
 */
async function performOCR(imagePath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `tesseract "${imagePath}" stdout -l eng+chi_sim+chi_tra --psm 6`
    );
    return stdout.trim();
  } catch (error) {
    console.error('[VideoProcessor] OCR error:', error);
    return '';
  }
}

/**
 * Extract text from all frames using OCR
 */
export async function extractTextFromFrames(frames: Array<{ timestamp: number; path: string }>): Promise<string> {
  const allText: string[] = [];
  
  for (const frame of frames) {
    const text = await performOCR(frame.path);
    if (text) {
      allText.push(`[${Math.floor(frame.timestamp)}s] ${text}`);
    }
  }
  
  return allText.join('\n\n');
}

/**
 * Upload frame to S3 and return URL
 */
async function uploadFrameToS3(framePath: string, analysisId: number, frameIndex: number): Promise<string> {
  const frameBuffer = await readFile(framePath);
  const key = `video-analysis/${analysisId}/frame_${frameIndex}.jpg`;
  const result = await storagePut(key, frameBuffer, 'image/jpeg');
  return result.url;
}

/**
 * Analyze frames using multimodal AI
 */
export async function analyzeFramesWithAI(
  frames: Array<{ timestamp: number; path: string }>,
  analysisId: number
): Promise<Array<{ timestamp: number; frameUrl: string; description: string; objects: string[]; scene: string }>> {
  const results = [];
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    try {
      // Upload frame to S3 first
      const frameUrl = await uploadFrameToS3(frame.path, analysisId, i + 1);
      
      // Analyze with AI
      const response = await invokeLLM({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请详细分析这张视频截图，包括：1) 场景描述 2) 主要物体和人物 3) 画面中的文字内容 4) 整体氛围和风格。请用JSON格式返回：{"scene": "场景描述", "objects": ["物体1", "物体2"], "description": "详细描述"}',
              },
              {
                type: 'image_url',
                image_url: {
                  url: frameUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'frame_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                scene: { type: 'string', description: '场景描述' },
                objects: { type: 'array', items: { type: 'string' }, description: '主要物体和人物列表' },
                description: { type: 'string', description: '详细描述' },
              },
              required: ['scene', 'objects', 'description'],
              additionalProperties: false,
            },
          },
        },
      });
      
      const content = response.choices[0].message.content;
      const analysis = JSON.parse(typeof content === 'string' ? content : '{}');
      
      results.push({
        timestamp: Math.floor(frame.timestamp),
        frameUrl,
        description: analysis.description || '',
        objects: analysis.objects || [],
        scene: analysis.scene || '',
      });
    } catch (error) {
      console.error(`[VideoProcessor] Failed to analyze frame ${i + 1}:`, error);
      
      // Fallback: just upload the frame without AI analysis
      try {
        const frameUrl = await uploadFrameToS3(frame.path, analysisId, i + 1);
        results.push({
          timestamp: Math.floor(frame.timestamp),
          frameUrl,
          description: '分析失败',
          objects: [],
          scene: '未知',
        });
      } catch (uploadError) {
        console.error(`[VideoProcessor] Failed to upload frame ${i + 1}:`, uploadError);
      }
    }
  }
  
  return results;
}

/**
 * Generate content summary using AI
 */
export async function generateContentSummary(
  videoMetadata: any,
  frameAnalysis: any[],
  ocrText: string,
  transcript?: string
): Promise<{ summary: string; keyPoints: string[] }> {
  try {
    const prompt = `请基于以下视频信息生成内容摘要和关键要点：

视频标题：${videoMetadata.title || '未知'}
视频描述：${videoMetadata.description || '无'}
作者：${videoMetadata.author || '未知'}

${transcript ? `语音文字稿（最重要）：
${transcript}

` : ''}画面分析：
${frameAnalysis.map((f, i) => `[${f.timestamp}s] 场景：${f.scene}\n描述：${f.description}\n物体：${f.objects.join(', ')}`).join('\n\n')}

画面文字（OCR）：
${ocrText || '无文字识别'}

请生成：
1. 一段200字以内的内容摘要${transcript ? '（主要基于语音文字稿）' : ''}
2. 3-5个关键要点${transcript ? '（提取语音中的核心信息）' : ''}

返回JSON格式：{"summary": "摘要内容", "keyPoints": ["要点1", "要点2", "要点3"]}`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: '你是一个专业的视频内容分析师，擅长从多维度信息中提取核心内容和关键要点。' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'content_summary',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: '内容摘要' },
              keyPoints: { type: 'array', items: { type: 'string' }, description: '关键要点列表' },
            },
            required: ['summary', 'keyPoints'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : '{}');
    return {
      summary: result.summary || '无法生成摘要',
      keyPoints: result.keyPoints || [],
    };
  } catch (error) {
    console.error('[VideoProcessor] Failed to generate summary:', error);
    return {
      summary: '摘要生成失败',
      keyPoints: [],
    };
  }
}

/**
 * Clean up temporary files
 */
export async function cleanupTempFiles(analysisId: number): Promise<void> {
  try {
    // Clean up video file
    const videoPath = path.join(TEMP_DIR, `video_${analysisId}.mp4`);
    if (existsSync(videoPath)) {
      await unlink(videoPath);
    }
    
    // Clean up audio file
    const audioPath = path.join(TEMP_DIR, `audio_${analysisId}.mp3`);
    if (existsSync(audioPath)) {
      await unlink(audioPath);
    }
    
    // Clean up frame files
    for (let i = 1; i <= FRAMES_PER_VIDEO; i++) {
      const framePath = path.join(TEMP_DIR, `frame_${analysisId}_${i}.jpg`);
      if (existsSync(framePath)) {
        await unlink(framePath);
      }
    }
  } catch (error) {
    console.error('[VideoProcessor] Cleanup error:', error);
  }
}
