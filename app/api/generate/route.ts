import { NextRequest, NextResponse } from 'next/server';
import { extractUrlData, generateArticle } from '../../../lib/aio';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, keyword, industry, articleType, mode } = body as {
    url?: string;
    keyword?: string;
    industry?: string;
    articleType?: string;
    mode?: 'inspect' | 'generate';
  };

  const urlData = url ? await extractUrlData(url) : await extractUrlData('https://example.com');
  if (mode === 'inspect') {
    return NextResponse.json({ urlData, message: 'URL解析が完了しました。' });
  }
  const { article, faqSchema, engine } = await generateArticle({ keyword: keyword || 'AIO記事', industry: industry || '美容医療', articleType: articleType || 'コラム記事', urlData });
  const message = engine === 'claude' ? 'Claudeで記事を生成しました。' : 'テンプレートで記事を生成しました（APIキー未設定）。';
  return NextResponse.json({ article, urlData, faqSchema, engine, message });
}
