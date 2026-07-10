import { createClient, type Client, type InArgs } from '@libsql/client';

// 既存の呼び出し側（db.all / db.run / db.exec）をそのまま使えるようにするアダプタ型
type Database = {
  all: <T = Record<string, unknown>>(sql: string, params?: InArgs) => Promise<T[]>;
  run: (sql: string, params?: InArgs) => Promise<{ lastID: number; changes: number }>;
  exec: (sql: string) => Promise<void>;
};

let dbPromise: Promise<Database> | null = null;

// 接続先を決定する。
// - TURSO_DATABASE_URL があればそれ（本番: Turso / libSQL リモート）
// - なければローカルのファイルDB（開発時: file:local.db）
function buildClient(): Client {
  const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient(authToken ? { url, authToken } : { url });
}

export async function getDatabase(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const client = buildClient();

      // スキーマ初期化（複数ステートメントは executeMultiple で実行）
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS industries (
          id INTEGER PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          banned_expressions TEXT,
          caution_expressions TEXT,
          recommended_structure TEXT
        );
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY,
          keyword TEXT,
          area TEXT,
          industry TEXT,
          article_type TEXT,
          title TEXT,
          content TEXT,
          status TEXT DEFAULT 'draft',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS wordpress_settings (
          id INTEGER PRIMARY KEY,
          site_url TEXT,
          username TEXT,
          password TEXT,
          auth_token TEXT
        );
      `);

      // libSQL の execute 結果を、旧 sqlite ラッパ相当のAPIに橋渡しする
      const adapter: Database = {
        all: async <T = Record<string, unknown>>(sql: string, params?: InArgs) => {
          const result = await client.execute({ sql, args: params ?? [] });
          return result.rows as unknown as T[];
        },
        run: async (sql: string, params?: InArgs) => {
          const result = await client.execute({ sql, args: params ?? [] });
          return {
            lastID: Number(result.lastInsertRowid ?? 0),
            changes: result.rowsAffected
          };
        },
        exec: async (sql: string) => {
          await client.executeMultiple(sql);
        }
      };

      return adapter;
    })();
  }
  return dbPromise;
}

export async function seedIndustries() {
  const db = await getDatabase();
  const industries = [
    '美容医療',
    '健康食品',
    '整体',
    'エステ',
    '遺品整理',
    '特殊清掃',
    '工務店',
    '介護施設',
    '士業',
    '店舗ビジネス'
  ];
  for (const name of industries) {
    await db.run(
      `INSERT OR IGNORE INTO industries (name, banned_expressions, caution_expressions, recommended_structure) VALUES (?, ?, ?, ?);`,
      [name, '', '', '結論,悩み,解決策,専門解説,事例,FAQ,CTA']
    );
  }
}
