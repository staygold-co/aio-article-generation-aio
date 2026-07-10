import { NextResponse } from 'next/server';

// 診断用エンドポイント（秘密の値は返さず、設定の有無のみ）
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: 'health-1',
    env: {
      hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
      hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
      hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY)
    }
  });
}
