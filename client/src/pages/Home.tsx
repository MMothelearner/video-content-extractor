import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Video, Sparkles, FileText, Image as ImageIcon, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();

  const analyzeMutation = trpc.video.analyze.useMutation({
    onSuccess: (data) => {
      toast.success("分析任务已创建，正在处理中...");
      setLocation(`/analysis/${data.analysisId}`);
    },
    onError: (error) => {
      toast.error(error.message || "创建分析任务失败");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl.trim()) {
      toast.error("请输入视频链接");
      return;
    }

    try {
      new URL(videoUrl);
    } catch {
      toast.error("请输入有效的视频链接");
      return;
    }

    setIsSubmitting(true);
    analyzeMutation.mutate({ videoUrl: videoUrl.trim() });
  };

  const handleViewHistory = () => {
    setLocation("/history");
  };

  // No loading check needed for personal tool

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">视频内容分析工具</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleViewHistory}>
              历史记录
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>AI 驱动的视频内容分析</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            深度提取视频文案与画面信息
          </h1>
          
          <p className="text-lg text-muted-foreground">
            支持抖音、TikTok、YouTube、小红书、B站等20+平台，自动提取视频标题、描述、画面内容、文字识别，生成结构化分析报告
          </p>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="mt-8">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="粘贴视频链接（支持抖音、TikTok、YouTube等）"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1 h-12 text-base"
                    />
                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmitting}
                      className="px-8"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          分析中
                        </>
                      ) : (
                        <>
                          开始分析
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-16 border-t">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">核心功能</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>文案提取</CardTitle>
                <CardDescription>
                  自动提取视频标题、描述、话题标签、作者信息等文本内容
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>画面分析</CardTitle>
                <CardDescription>
                  提取关键帧，使用 AI 分析场景、物体、人物等画面内容
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>OCR 识别</CardTitle>
                <CardDescription>
                  识别视频画面中的文字内容，支持中英文混合识别
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="container py-16 border-t">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">支持的平台</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "抖音", "TikTok", "YouTube", "小红书", "哔哩哔哩", 
              "快手", "微博", "Instagram", "Twitter", "更多..."
            ].map((platform) => (
              <Badge key={platform} variant="secondary" className="px-4 py-2 text-sm">
                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                {platform}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 视频内容分析工具. Powered by TikHub API & Manus AI</p>
        </div>
      </footer>
    </div>
  );
}
