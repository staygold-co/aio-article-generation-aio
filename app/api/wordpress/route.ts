import { NextRequest, NextResponse } from 'next/server';
import { sendToWordpress } from '../../../lib/aio';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content, keywords, articleType } = body as {
    title: string;
    content: string;
    keywords: string;
    articleType: string;
  };

  const result = await sendToWordpress({ title, content, keywords, articleType });
  return NextResponse.json(result);
}
