import { NextResponse } from 'next/server';
import { getDatabase, seedIndustries } from '../../../lib/db';

// 実行時に必ずDBを参照する（ビルド時の静的スナップショットを避ける）
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await getDatabase();
  let rows = await db.all<{ name: string }>('SELECT name FROM industries ORDER BY name');
  if (!rows.length) {
    await seedIndustries();
    rows = await db.all<{ name: string }>('SELECT name FROM industries ORDER BY name');
  }
  const industries = rows.map((row) => row.name);
  return NextResponse.json({ industries });
}
