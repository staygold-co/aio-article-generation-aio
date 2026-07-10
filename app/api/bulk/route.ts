import { NextRequest, NextResponse } from 'next/server';
import { generateArticle } from '../../../lib/aio';
import { getDatabase } from '../../../lib/db';

// 一括処理の上限行数（レート制限・処理時間対策）
const MAX_ROWS = 30;

type BulkRow = {
  keyword: string;
  industry?: string;
  articleType?: string;
};

type BulkResult = {
  keyword: string;
  industry: string;
  articleType: string;
  status: 'created' | 'skipped' | 'error';
  engine?: 'claude' | 'template';
  message?: string;
};

// CSV一括生成: 行配列を受け取り、逐次で記事生成→DB保存し、結果サマリを返す
export async function POST(request: NextRequest) {
  let rows: BulkRow[] = [];
  try {
    const body = await request.json();
    rows = Array.isArray(body?.rows) ? body.rows : [];
  } catch {
    return NextResponse.json(
      { results: [], created: 0, truncated: false, message: 'リクエストボディが不正です。' },
      { status: 400 }
    );
  }

  // 上限を超えた分は処理せず truncated フラグで通知する
  const truncated = rows.length > MAX_ROWS;
  const targetRows = rows.slice(0, MAX_ROWS);

  const results: BulkResult[] = [];
  let created = 0;

  // レート制限とDB競合を避けるため、並列にせず逐次処理する
  for (const row of targetRows) {
    const keyword = (row?.keyword ?? '').trim();
    const industry = (row?.industry ?? '').trim() || '美容医療';
    const articleType = (row?.articleType ?? '').trim() || 'コラム記事';

    // キーワードが空の行はスキップ扱い
    if (!keyword) {
      results.push({
        keyword: '',
        industry,
        articleType,
        status: 'skipped',
        message: 'キーワードが空のためスキップしました。'
      });
      continue;
    }

    try {
      // 記事生成（urlDataは渡さず、内部の既定ダミーを利用）
      const generated = await generateArticle({ keyword, industry, articleType });

      // 既存の articles POST と同じ列・値でDBに保存（titleはkeyword、statusはdraft）
      const db = await getDatabase();
      await db.run(
        `INSERT INTO articles (keyword, industry, article_type, title, content, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [keyword, industry, articleType, keyword, generated.article, 'draft']
      );

      created += 1;
      results.push({
        keyword,
        industry,
        articleType,
        status: 'created',
        engine: generated.engine
      });
    } catch (error) {
      // 1件の失敗で全体を止めず、エラーとして記録して続行する
      results.push({
        keyword,
        industry,
        articleType,
        status: 'error',
        message: error instanceof Error ? error.message : '不明なエラーが発生しました。'
      });
    }
  }

  return NextResponse.json({ results, created, truncated });
}
