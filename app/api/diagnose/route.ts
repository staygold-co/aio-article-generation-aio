import { NextRequest, NextResponse } from 'next/server';
import { diagnoseArticle } from '../../../lib/aio';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, keyword, industry, articleType } = body as {
    content: string;
    keyword?: string;
    industry?: string;
    articleType?: string;
  };

  if (!content) {
    return NextResponse.json({ message: '診断するコンテンツがありません。', score: null });
  }

  const result = await diagnoseArticle({ content, keyword: keyword || '', industry: industry || '', articleType: articleType || '' });
  const message = result.engine === 'claude' ? 'Claudeで診断しました。' : '簡易診断を実行しました（APIキー未設定）。';
  return NextResponse.json({ score: result.score, engine: result.engine, message });
}
