import axios from 'axios';

const TIKHUB_BASE_URL = 'https://api.tikhub.io';

interface TikHubResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * Platform detection from video URL
 */
export function detectPlatform(url: string): string | null {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('douyin.com') || urlLower.includes('iesdouyin.com')) {
    return 'douyin';
  }
  if (urlLower.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  }
  if (urlLower.includes('xiaohongshu.com') || urlLower.includes('xhslink.com')) {
    return 'xiaohongshu';
  }
  if (urlLower.includes('bilibili.com') || urlLower.includes('b23.tv')) {
    return 'bilibili';
  }
  if (urlLower.includes('kuaishou.com')) {
    return 'kuaishou';
  }
  if (urlLower.includes('weibo.com') || urlLower.includes('weibo.cn')) {
    return 'weibo';
  }
  if (urlLower.includes('instagram.com')) {
    return 'instagram';
  }
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return 'twitter';
  }
  
  return null;
}

/**
 * Fetch Douyin video data
 */
export async function fetchDouyinVideo(videoUrl: string, token: string) {
  try {
    const response = await axios.get<TikHubResponse>(
      `${TIKHUB_BASE_URL}/api/v1/douyin/app/v3/fetch_one_video_by_share_url`,
      {
        params: { share_url: videoUrl },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Failed to fetch Douyin video');
    }

    return response.data.data;
  } catch (error) {
    console.error('[TikHub] Douyin fetch error:', error);
    throw error;
  }
}

/**
 * Fetch TikTok video data
 */
export async function fetchTikTokVideo(videoUrl: string, token: string) {
  try {
    const response = await axios.get<TikHubResponse>(
      `${TIKHUB_BASE_URL}/api/v1/tiktok/app/v3/fetch_one_video_by_share_url`,
      {
        params: { share_url: videoUrl },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Failed to fetch TikTok video');
    }

    return response.data.data;
  } catch (error) {
    console.error('[TikHub] TikTok fetch error:', error);
    throw error;
  }
}

/**
 * Fetch YouTube video data
 */
export async function fetchYouTubeVideo(videoUrl: string, token: string) {
  try {
    // Extract video ID from URL
    let videoId = '';
    if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (videoUrl.includes('youtube.com/watch?v=')) {
      const urlParams = new URLSearchParams(videoUrl.split('?')[1]);
      videoId = urlParams.get('v') || '';
    }

    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const response = await axios.get<TikHubResponse>(
      `${TIKHUB_BASE_URL}/api/v1/youtube/web/get_video_info`,
      {
        params: { video_id: videoId },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Failed to fetch YouTube video');
    }

    return response.data.data;
  } catch (error) {
    console.error('[TikHub] YouTube fetch error:', error);
    throw error;
  }
}

/**
 * Fetch YouTube video subtitles
 */
export async function fetchYouTubeSubtitles(videoId: string, token: string) {
  try {
    const response = await axios.get<TikHubResponse>(
      `${TIKHUB_BASE_URL}/api/v1/youtube/web/get_video_subtitles`,
      {
        params: { video_id: videoId },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    if (response.data.code !== 200) {
      return null; // Subtitles might not be available
    }

    return response.data.data;
  } catch (error) {
    console.error('[TikHub] YouTube subtitles fetch error:', error);
    return null;
  }
}

/**
 * Fetch Xiaohongshu (Little Red Book) note data
 */
export async function fetchXiaohongshuVideo(videoUrl: string, token: string) {
  try {
    const response = await axios.get<TikHubResponse>(
      `${TIKHUB_BASE_URL}/api/v1/xiaohongshu/app/get_note_info`,
      {
        params: { url: videoUrl },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Failed to fetch Xiaohongshu video');
    }

    return response.data.data;
  } catch (error) {
    console.error('[TikHub] Xiaohongshu fetch error:', error);
    throw error;
  }
}

/**
 * Fetch Bilibili video data
 */
export async function fetchBilibiliVideo(videoUrl: string, token: string) {
  try {
    const response = await axios.get<TikHubResponse>(
      `${TIKHUB_BASE_URL}/api/v1/bilibili/app/fetch_one_video`,
      {
        params: { url: videoUrl },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Failed to fetch Bilibili video');
    }

    return response.data.data;
  } catch (error) {
    console.error('[TikHub] Bilibili fetch error:', error);
    throw error;
  }
}

/**
 * Generic video fetch function that routes to the appropriate platform handler
 */
export async function fetchVideoData(videoUrl: string, token: string) {
  const platform = detectPlatform(videoUrl);
  
  if (!platform) {
    throw new Error('Unsupported platform or invalid URL');
  }

  switch (platform) {
    case 'douyin':
      return { platform, data: await fetchDouyinVideo(videoUrl, token) };
    case 'tiktok':
      return { platform, data: await fetchTikTokVideo(videoUrl, token) };
    case 'youtube':
      return { platform, data: await fetchYouTubeVideo(videoUrl, token) };
    case 'xiaohongshu':
      return { platform, data: await fetchXiaohongshuVideo(videoUrl, token) };
    case 'bilibili':
      return { platform, data: await fetchBilibiliVideo(videoUrl, token) };
    default:
      throw new Error(`Platform ${platform} is not yet implemented`);
  }
}
