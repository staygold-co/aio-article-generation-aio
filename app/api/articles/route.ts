import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db';

export async function GET() {
  const db = await getDatabase();
  const rows = await db.all(
    `SELECT id, keyword, industry, article_type AS articleType, title, status, created_at AS createdAt
     FROM articles
     ORDER BY created_at DESC`
  );
  return NextResponse.json({ articles: rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { keyword, industry, articleType, title, content } = body as {
    keyword: string;
    industry: string;
    articleType: string;
    title: string;
    content: string;
  };

  const db = await getDatabase();
  const result = await db.run(
    `INSERT INTO articles (keyword, industry, article_type, title, content, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [keyword, industry, articleType, title, content, 'draft']
  );

  return NextResponse.json({ success: true, id: result.lastID });
}
