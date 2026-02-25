"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BlockBreakScreenProps {
  blockNumber: number; // 1-based (just completed block)
  totalBlocks: number;
  completedCases: number;
  totalCases: number;
  onContinue: () => void;
  onBackToDashboard: () => void;
}

export function BlockBreakScreen({
  blockNumber,
  totalBlocks,
  completedCases,
  totalCases,
  onContinue,
  onBackToDashboard,
}: BlockBreakScreenProps) {
  const progressPercent = (completedCases / totalCases) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-2xl">
            ブロック {blockNumber}/{totalBlocks} 完了
          </CardTitle>
          <p className="text-muted-foreground">
            Block {blockNumber} of {totalBlocks} Complete
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>進捗 / Progress</span>
              <span>{completedCases}/{totalCases} 症例</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">
              少し休憩してください
            </p>
            <p className="text-xs text-muted-foreground">
              Please take a short break before continuing to the next block.
            </p>
          </div>

          <Button onClick={onContinue} className="w-full" size="lg">
            次のブロックへ → / Continue to Block {blockNumber + 1} →
          </Button>
          <Button onClick={onBackToDashboard} variant="outline" className="w-full" size="lg">
            ダッシュボードに戻る / Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
