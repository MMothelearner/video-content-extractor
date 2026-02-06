
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Video, Clock, CheckCircle2, XCircle, Loader as LoaderIcon } from "lucide-react";

import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function History() {
  const [, setLocation] = useLocation();

  const { data: analyses, isLoading, error } = trpc.video.getHistory.useQuery();

  // No auth check needed for personal tool

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">{error.message || "加载失败"}</p>
            <Button className="mt-4" onClick={() => setLocation("/")}>返回首页</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <LoaderIcon className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const statusText = (status: string) => {
    const map: Record<string, string> = {
      pending: "等待中",
      downloading: "下载中",
      extracting: "提取中",
      analyzing: "分析中",
      completed: "已完成",
      failed: "失败",
    };
    return map[status] || "未知";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-semibold">分析历史</span>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        {!analyses || analyses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">暂无分析记录</p>
              <Button onClick={() => setLocation("/")}>开始分析</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <Card 
                key={analysis.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(`/analysis/${analysis.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {analysis.coverUrl && (
                      <img 
                        src={analysis.coverUrl} 
                        alt="视频封面"
                        className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold line-clamp-2">
                          {analysis.title || analysis.videoUrl}
                        </h3>
                        <Badge 
                          variant={
                            analysis.status === 'completed' ? 'default' : 
                            analysis.status === 'failed' ? 'destructive' : 
                            'secondary'
                          }
                          className="flex items-center gap-1.5 flex-shrink-0"
                        >
                          {statusIcon(analysis.status)}
                          {statusText(analysis.status)}
                        </Badge>
                      </div>
                      
                      {analysis.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {analysis.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {analysis.platform && (
                          <Badge variant="outline" className="text-xs">
                            {analysis.platform}
                          </Badge>
                        )}
                        {analysis.author && (
                          <span>{analysis.author}</span>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(analysis.createdAt), { 
                            addSuffix: true,
                            locale: zhCN 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
