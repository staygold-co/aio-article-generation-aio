'use client';

import { useEffect, useState } from 'react';

type UrlData = {
  title: string;
  description: string;
  services: string[];
  companyInfo: string;
  strengths: string[];
  regions: string[];
  pricing: string;
  faq: string[];
  cta: string;
  existingArticles: string[];
  internalLinks: string[];
  headings: string[];
};

type ScoreResult = {
  aioScore: number;
  eeatScore: number;
  expertiseScore: number;
  faqScore: number;
  schemaScore: number;
  originalityScore: number;
  shareabilityScore: number;
  localSeoScore: number;
  ctaScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
};

type SavedArticle = {
  id: number;
  keyword: string;
  industry: string;
  articleType: string;
  title: string;
  status: string;
  createdAt: string;
};

type BulkResult = {
  keyword: string;
  industry: string;
  articleType: string;
  status: 'created' | 'skipped' | 'error';
  engine?: 'claude' | 'template';
  message?: string;
};

// テキストエリアに貼り付けられたCSVを行配列に変換する（外部ライブラリ不使用）
function parseCsvRows(text: string): Array<{ keyword: string; industry?: string; articleType?: string }> {
  const lines = text.split(/\r?\n/);
  const rows: Array<{ keyword: string; industry?: string; articleType?: string }> = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const cells = line.split(',').map((cell) => cell.trim());
    if (index === 0 && cells[0].toLowerCase() === 'keyword') return;
    const keyword = cells[0] ?? '';
    if (!keyword) return;
    rows.push({
      keyword,
      industry: cells[1] || undefined,
      articleType: cells[2] || undefined
    });
  });
  return rows;
}

const articleTypes = [
  'コラム記事',
  'FAQ記事',
  '地域ページ',
  '比較記事',
  '事例記事',
  'WordPress用SEO記事',
  'note用読み物記事',
  '代表者コラム風記事'
];

// 共通スタイル（ダーク×グラスモーフィズム）
const CARD = 'glass glass-hover rounded-3xl shadow-panel';
const EYEBROW = 'text-[11px] font-medium uppercase tracking-[0.32em] text-teal-300/70';
const FIELD_LABEL = 'text-xs font-medium uppercase tracking-[0.14em] text-slate-400';
const INPUT =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-teal-300/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-teal-400/20';
const BTN_PRIMARY =
  'rounded-xl bg-gradient-to-r from-teal-400 to-violet-500 px-5 py-3 text-sm font-semibold tracking-wide text-slate-950 shadow-glow-teal transition hover:shadow-glow-violet hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50';
const BTN_SECONDARY =
  'rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold tracking-wide text-slate-200 transition hover:border-teal-300/40 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50';

export default function Home() {
  const [industries, setIndustries] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState('美容医療');
  const [articleType, setArticleType] = useState(articleTypes[0]);
  const [urlData, setUrlData] = useState<UrlData | null>(null);
  const [article, setArticle] = useState('');
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [csvText, setCsvText] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkCreated, setBulkCreated] = useState(0);
  const [bulkTruncated, setBulkTruncated] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  const fetchSavedArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      const data = await res.json();
      setSavedArticles(data.articles || []);
    } catch {
      setSavedArticles([]);
    }
  };

  useEffect(() => {
    fetch('/api/industries')
      .then((res) => res.json())
      .then((data) => setIndustries(data.industries || []))
      .catch(() => setIndustries(['美容医療', '健康食品', '整体']));
    fetchSavedArticles();
  }, []);

  const handleAnalyzeUrl = async () => {
    if (!url) {
      setMessage('URLを入力してください。');
      return;
    }
    setIsLoading(true);
    setMessage('URLを解析しています...');
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, keyword, industry, articleType, mode: 'inspect' })
    });
    const data = await res.json();
    setUrlData(data.urlData ?? null);
    setMessage(data.message ?? '解析完了。');
    setIsLoading(false);
  };

  const handleGenerate = async () => {
    if (!keyword) {
      setMessage('キーワードを入力してください。');
      return;
    }
    setIsLoading(true);
    setMessage('AIが記事を生成中です...（数分かかる場合があります）');
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, keyword, industry, articleType, mode: 'generate' })
    });
    const data = await res.json();
    setArticle(data.article ?? '');
    setUrlData(data.urlData ?? urlData);
    setMessage(data.message ?? '記事生成が完了しました。');
    setIsLoading(false);

    if (data.article) {
      const saveRes = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, industry, articleType, title: keyword, content: data.article })
      });
      if (saveRes.ok) {
        await fetchSavedArticles();
      }
    }
  };

  const handleDiagnose = async () => {
    if (!article) {
      setMessage('生成された記事が必要です。');
      return;
    }
    setIsLoading(true);
    setMessage('AIOスコアを診断しています...');
    const res = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: article, keyword, industry, articleType })
    });
    const data = await res.json();
    setScore(data.score ?? null);
    setMessage(data.message ?? '診断が完了しました。');
    setIsLoading(false);
  };

  const handlePostWordpress = async () => {
    if (!article) {
      setMessage('投稿する記事を生成してください。');
      return;
    }
    setIsLoading(true);
    setMessage('WordPressに投稿しています...');
    const res = await fetch('/api/wordpress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: keyword || 'AIO Content Factory記事', content: article, keywords: keyword, articleType })
    });
    const data = await res.json();
    setMessage(data.message || 'WordPress投稿が完了しました。');
    setIsLoading(false);

    if (res.ok && data.success) {
      const saveRes = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, industry, articleType, title: keyword || 'AIO Content Factory記事', content: article })
      });
      if (saveRes.ok) {
        await fetchSavedArticles();
      }
    }
  };

  const handleBulkGenerate = async () => {
    const rows = parseCsvRows(csvText);
    if (rows.length === 0) {
      setBulkMessage('有効な行がありません。CSVを貼り付けてください。');
      return;
    }
    setBulkLoading(true);
    setBulkMessage(`AIが一括生成中です...（${rows.length}件）`);
    setBulkResults([]);
    try {
      const res = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });
      const data = await res.json();
      setBulkResults(data.results || []);
      setBulkCreated(data.created ?? 0);
      setBulkTruncated(Boolean(data.truncated));
      setBulkMessage(`一括生成が完了しました。${data.created ?? 0}件の記事を保存しました。`);
      await fetchSavedArticles();
    } catch {
      setBulkMessage('一括生成に失敗しました。時間をおいて再度お試しください。');
    }
    setBulkLoading(false);
  };

  return (
    <>
      <BackgroundFX />
      <main className="relative z-10 min-h-screen px-6 py-10 md:px-10">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* ヒーロー */}
          <header className={`${CARD} relative overflow-hidden p-8 md:p-12`}>
            {/* 常時流れるスキャンライン（AI稼働の演出） */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
              <div className="sweep h-px w-1/3 bg-gradient-to-r from-transparent via-teal-300/80 to-transparent" />
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={EYEBROW}>AIO Content Factory</span>
                  <StatusPill active={isLoading || bulkLoading} />
                </div>
                <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
                  <span className="gradient-text">AIO Article</span>
                  <br />
                  <span className="text-white">Generation AI</span>
                </h1>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-400">
                  URL解析・業種別の記事生成・AIOスコア診断・WordPress投稿までを、AIがワンストップで自動化。
                  ChatGPT引用とGoogle AI Overview露出を狙う高品質コンテンツを、常時稼働のエンジンが生成し続けます。
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    { t: '公開ページ', d: 'URLから記事要素を抽出' },
                    { t: '記事生成', d: '業種・記事タイプ別にAI生成' },
                    { t: '診断と投稿', d: 'AIO診断とWordPress連携' }
                  ].map((f) => (
                    <div key={f.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">{f.t}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI稼働コア（常時回転・脈動） */}
              <div className="flex justify-center">
                <AICore active={isLoading || bulkLoading} />
              </div>
            </div>
          </header>

          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            {/* 入力パネル */}
            <div className={`${CARD} p-8`}>
              <p className={EYEBROW}>Configuration</p>
              <div className="mt-6 space-y-6">
                <div className="grid gap-5 lg:grid-cols-2">
                  <label className="block space-y-2">
                    <span className={FIELD_LABEL}>サイトURL</span>
                    <input value={url} onChange={(e) => setUrl(e.target.value)} className={INPUT} placeholder="https://example.com" />
                  </label>
                  <label className="block space-y-2">
                    <span className={FIELD_LABEL}>キーワード</span>
                    <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className={INPUT} placeholder="地域名 + サービス名" />
                  </label>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <label className="block space-y-2">
                    <span className={FIELD_LABEL}>業種</span>
                    <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={INPUT}>
                      {industries.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className={FIELD_LABEL}>記事タイプ</span>
                    <select value={articleType} onChange={(e) => setArticleType(e.target.value)} className={INPUT}>
                      {articleTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <button type="button" onClick={handleAnalyzeUrl} disabled={isLoading} className={BTN_SECONDARY}>
                    {isLoading ? '処理中…' : 'URL解析'}
                  </button>
                  <button type="button" onClick={handleGenerate} disabled={isLoading} className={BTN_PRIMARY}>
                    {isLoading ? '生成中…' : '記事生成'}
                  </button>
                  <button type="button" onClick={handleDiagnose} disabled={isLoading} className={BTN_SECONDARY}>
                    {isLoading ? '処理中…' : 'AIO診断'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* ステータス */}
              <div className={`${CARD} p-8`}>
                <div className="flex items-center justify-between">
                  <p className={EYEBROW}>Engine Status</p>
                  <Equalizer active={isLoading || bulkLoading} />
                </div>
                <div className="mt-4 flex items-start gap-3">
                  {isLoading && <span className="mt-1 h-4 w-4 flex-none animate-spin rounded-full border-2 border-teal-300/30 border-t-teal-300" />}
                  <p className="text-[15px] leading-relaxed text-slate-300">{message || 'エンジンは稼働中です。操作を開始してください。'}</p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={handlePostWordpress} disabled={isLoading} className={BTN_PRIMARY}>
                    {isLoading ? '処理中…' : 'WordPress投稿'}
                  </button>
                  <button type="button" onClick={() => window.location.reload()} className={BTN_SECONDARY}>
                    リセット
                  </button>
                </div>
              </div>

              {/* AIOスコア */}
              <div className={`${CARD} p-8`}>
                <p className={EYEBROW}>AIO Score</p>
                {score ? (
                  <div className="mt-5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ArticleScore label="AIO最適化" value={score.aioScore} />
                      <ArticleScore label="E-E-A-T" value={score.eeatScore} />
                      <ArticleScore label="専門性" value={score.expertiseScore} />
                      <ArticleScore label="FAQ充実度" value={score.faqScore} />
                      <ArticleScore label="Schema対応" value={score.schemaScore} />
                      <ArticleScore label="独自性" value={score.originalityScore} />
                      <ArticleScore label="引用されやすさ" value={score.shareabilityScore} />
                      <ArticleScore label="地域SEO" value={score.localSeoScore} />
                      <ArticleScore label="CTAの明確さ" value={score.ctaScore} />
                    </div>
                    {score.summary && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-relaxed text-slate-300">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300/80">総評</p>
                        <p className="mt-2">{score.summary}</p>
                      </div>
                    )}
                    {score.strengths?.length > 0 && (
                      <div className="rounded-2xl border border-teal-400/20 bg-teal-500/[0.06] p-5 text-sm leading-relaxed text-slate-300">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">強み（引用されやすい点）</p>
                        <ul className="mt-2 space-y-1.5 list-disc list-inside marker:text-teal-400">
                          {score.strengths.map((item, i) => (<li key={i}>{item}</li>))}
                        </ul>
                      </div>
                    )}
                    {score.improvements?.length > 0 && (
                      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-5 text-sm leading-relaxed text-slate-300">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">優先度順の改善アクション</p>
                        <ol className="mt-2 space-y-1.5 list-decimal list-inside marker:font-semibold marker:text-violet-400">
                          {score.improvements.map((item, i) => (<li key={i}>{item}</li>))}
                        </ol>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">記事診断を実行するとスコアと改善提案を表示します。</p>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* 生成結果 */}
            <div className={`${CARD} p-8`}>
              <p className={EYEBROW}>Output</p>
              <div className="mt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">記事プレビュー</h2>
                  <div className="relative mt-3 min-h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    {/* 生成中のスキャン演出 */}
                    {isLoading && (
                      <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-teal-300/15 to-transparent" />
                    )}
                    <div className="relative whitespace-pre-wrap text-[15px] leading-relaxed text-slate-300">
                      {article || 'ここに生成された記事が表示されます。'}
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">FAQ Schema</h2>
                  <div className="mt-3 min-h-[160px] whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    {urlData?.faq ? (
                      <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-teal-100/70">{
                        JSON.stringify({
                          '@context': 'https://schema.org',
                          '@type': 'FAQPage',
                          mainEntity: urlData.faq.map((question) => ({
                            '@type': 'Question',
                            name: question,
                            acceptedAnswer: { '@type': 'Answer', text: 'お問い合わせください。' }
                          }))
                        }, null, 2)
                      }</pre>
                    ) : (
                      <p className="text-sm text-slate-500">FAQ SchemaはURL解析後に表示されます。</p>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">URL解析結果</h2>
                  <div className="mt-3 min-h-[160px] rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    {urlData ? (
                      <dl className="space-y-2.5 text-sm text-slate-300">
                        <Row label="タイトル" value={urlData.title} />
                        <Row label="説明" value={urlData.description} />
                        <Row label="サービス" value={urlData.services.join(' / ')} />
                        <Row label="地域" value={urlData.regions.join(' / ')} />
                        <Row label="料金" value={urlData.pricing} />
                        <Row label="CTA" value={urlData.cta} />
                        <Row label="見出し" value={urlData.headings.join(' › ')} />
                        <Row label="内部リンク候補" value={urlData.internalLinks.join(', ')} />
                      </dl>
                    ) : (
                      <p className="text-sm text-slate-500">URL解析を実行するとサイト情報をここに表示します。</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ダッシュボード */}
            <div className={`${CARD} p-8`}>
              <p className={EYEBROW}>Dashboard</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">現在の選択</p>
                  <dl className="mt-3 space-y-1.5 text-sm text-slate-300">
                    <Row label="業種" value={industry} />
                    <Row label="記事タイプ" value={articleType} />
                    <Row label="キーワード" value={keyword || '—'} />
                  </dl>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">機能一覧</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                    {['URL読み込み', '業種・記事タイプ選択', 'AIによるAIO記事生成', 'FAQ Schema対応', 'AIOスコア診断', 'CSV一括生成', 'WordPress投稿連携'].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-teal-300 to-violet-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">保存済み記事</p>
                  {savedArticles.length > 0 ? (
                    <ul className="mt-3 space-y-3">
                      {savedArticles.map((item) => (
                        <li key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="font-medium text-white">{item.title || item.keyword}</p>
                          <p className="mt-1 text-sm text-slate-400">{item.industry} / {item.articleType}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.createdAt}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">まだ保存された記事はありません。</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* CSV一括生成 */}
          <section className={`${CARD} p-8`}>
            <div className="space-y-6">
              <div>
                <p className={EYEBROW}>Bulk Generation</p>
                <h2 className="mt-3 text-xl font-semibold text-white">CSVを貼り付けて最大30件を一括生成</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  1列目=キーワード（必須）、2列目=業種（省略時: 美容医療）、3列目=記事タイプ（省略時: コラム記事）。1行目のヘッダは任意です。
                </p>
              </div>
              <label className="block space-y-2">
                <span className={FIELD_LABEL}>CSVデータ</span>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={6}
                  className={`${INPUT} font-mono text-sm`}
                  placeholder={'keyword,industry,articleType\n渋谷 美容医療,美容医療,コラム記事\n新宿 整体,整体,FAQ記事'}
                />
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <button type="button" onClick={handleBulkGenerate} disabled={bulkLoading} className={BTN_PRIMARY}>
                  {bulkLoading ? '一括生成中…' : '一括生成'}
                </button>
                {bulkMessage && (
                  <p className="flex items-center gap-2 text-sm text-slate-300">
                    {bulkLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-300/30 border-t-teal-300" />}
                    {bulkMessage}
                  </p>
                )}
              </div>
              {bulkTruncated && (
                <p className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  一度に処理できるのは最大30行です。31行目以降は処理されませんでした。
                </p>
              )}
              {bulkResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">結果一覧（作成: {bulkCreated}件 / 全{bulkResults.length}件）</p>
                  <ul className="space-y-2.5">
                    {bulkResults.map((result, index) => (
                      <li key={`${result.keyword}-${index}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            result.status === 'created'
                              ? 'bg-gradient-to-r from-teal-400 to-violet-500 text-slate-950'
                              : result.status === 'skipped'
                                ? 'border border-white/10 bg-white/5 text-slate-400'
                                : 'border border-rose-400/30 bg-rose-500/10 text-rose-300'
                          }`}
                        >
                          {result.status === 'created' ? '作成' : result.status === 'skipped' ? 'スキップ' : 'エラー'}
                        </span>
                        <span className="font-medium text-white">{result.keyword || '（キーワードなし）'}</span>
                        <span className="text-sm text-slate-400">{result.industry} / {result.articleType}</span>
                        {result.engine && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">{result.engine}</span>
                        )}
                        {result.message && <span className="text-xs text-slate-500">{result.message}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <footer className="pb-4 pt-2 text-center">
            <div className="mx-auto mb-4 h-px max-w-xs bg-gradient-to-r from-transparent via-teal-300/40 to-transparent" />
            <p className="text-xs tracking-[0.3em] text-slate-500">AIO ARTICLE GENERATION AI · POWERED BY CLAUDE</p>
          </footer>
        </div>
      </main>
    </>
  );
}

// ===== 稼働ステータスのピル（常時脈動） =====
function StatusPill({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wider text-slate-200">
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-violet-400' : 'bg-teal-300'} dot-live`} />
      {active ? 'AI PROCESSING' : 'AI ONLINE'}
    </span>
  );
}

// ===== イコライザー（AI稼働を示す動くバー） =====
function Equalizer({ active }: { active: boolean }) {
  const bars = [0, 0.12, 0.24, 0.36, 0.48];
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {bars.map((delay, i) => (
        <span
          key={i}
          className="eq-bar w-[3px] rounded-full bg-gradient-to-t from-teal-400 to-violet-400"
          style={{ height: '100%', animationDelay: `${delay}s`, animationDuration: active ? '0.7s' : '1.4s' }}
        />
      ))}
    </span>
  );
}

// ===== AI稼働コア（SVG・多重軌道＋周回電子＋ニューラル結線） =====
// 楕円軌道のパス文字列（中心160,160）
function ellipsePath(rx: number, ry: number): string {
  return `M ${160 - rx},160 a ${rx},${ry} 0 1,0 ${2 * rx},0 a ${rx},${ry} 0 1,0 ${-2 * rx},0`;
}

function AICore({ active }: { active: boolean }) {
  // リング上に等間隔でノードを配置（中心160,160）
  const nodes = (r: number, count: number, phase = 0) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + phase;
      return { x: 160 + r * Math.cos(a), y: 160 + r * Math.sin(a) };
    });

  // 傾いた原子軌道（楕円）＋周回電子の定義
  const orbits = [
    { id: 'o1', rx: 142, ry: 50, tilt: 0, dur: 6, color: '#5eead4', spin: 'spin-90' },
    { id: 'o2', rx: 142, ry: 50, tilt: 60, dur: 8, color: '#a78bfa', spin: 'spin-rev-50' },
    { id: 'o3', rx: 142, ry: 50, tilt: 120, dur: 7, color: '#38bdf8', spin: 'spin-60' },
    { id: 'o4', rx: 96, ry: 96, tilt: 0, dur: 5, color: '#5eead4', spin: 'spin-rev-30' }
  ];

  // ニューラル結線用のノード（内側リング上）
  const netNodes = nodes(84, 6);

  return (
    <div className={`floaty relative ${active ? 'scale-105' : ''} transition-transform duration-700`}>
      <svg viewBox="0 0 320 320" className="h-64 w-64 md:h-[22rem] md:w-[22rem]">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ccfbf1" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#2dd4bf" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {orbits.map((o) => (
            <path key={o.id} id={o.id} d={ellipsePath(o.rx, o.ry)} />
          ))}
        </defs>

        {/* 多層の背後グロー（位相差で脈動） */}
        <g className="svg-center">
          <circle cx="160" cy="160" r="72" fill="url(#core)" filter="url(#soft)" className="svg-center halo-pulse" style={{ animationDelay: '0s' }} />
          <circle cx="160" cy="160" r="52" fill="url(#core)" filter="url(#soft)" className="svg-center halo-pulse" style={{ animationDelay: '1.3s' }} />
        </g>

        {/* 最外周の回転ドット球（2枚が逆回転） */}
        <g className="svg-center spin-90">
          <circle cx="160" cy="160" r="150" fill="none" stroke="url(#ring)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="1 7" />
        </g>
        <g className="svg-center spin-rev-50">
          <circle cx="160" cy="160" r="150" fill="none" stroke="url(#ring)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="1 11" />
        </g>

        {/* エネルギーが流れる同心リング（dashoffsetアニメ） */}
        <circle cx="160" cy="160" r="128" fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1.4" strokeDasharray="6 10" className="dash-flow" />
        <circle cx="160" cy="160" r="108" fill="none" stroke="#a78bfa" strokeOpacity="0.3" strokeWidth="1.4" strokeDasharray="4 12" className="dash-flow-rev" />

        {/* ニューラル結線（内側ノード間・ちらつき） */}
        <g>
          {netNodes.map((n, i) => {
            const m = netNodes[(i + 2) % netNodes.length];
            return (
              <line
                key={i}
                x1={n.x}
                y1={n.y}
                x2={m.x}
                y2={m.y}
                stroke="#5eead4"
                strokeWidth="0.8"
                className="link-fl"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            );
          })}
        </g>

        {/* 傾いた原子軌道＋周回電子（精密回転＋公転） */}
        {orbits.map((o, idx) => (
          <g key={o.id} className={`svg-center ${o.spin}`}>
            <g transform={`rotate(${o.tilt} 160 160)`}>
              <use href={`#${o.id}`} fill="none" stroke="url(#ring)" strokeOpacity="0.55" strokeWidth="1.1" />
              {/* 周回する電子（軌道に沿って移動） */}
              <circle r={idx === 3 ? 4.5 : 4} fill={o.color}>
                <animateMotion dur={`${o.dur}s`} repeatCount="indefinite" begin={`-${idx * 1.3}s`}>
                  <mpath href={`#${o.id}`} />
                </animateMotion>
              </circle>
              {/* 電子の残光 */}
              <circle r={2} fill={o.color} opacity="0.5">
                <animateMotion dur={`${o.dur}s`} repeatCount="indefinite" begin={`-${idx * 1.3 + 0.25}s`}>
                  <mpath href={`#${o.id}`} />
                </animateMotion>
              </circle>
            </g>
          </g>
        ))}

        {/* 内側リング（ノードがちらつく） */}
        <g className="svg-center spin-24">
          <circle cx="160" cy="160" r="84" fill="none" stroke="url(#ring)" strokeOpacity="0.6" strokeWidth="1" strokeDasharray="3 6" />
          {netNodes.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r="3.5" fill="#38bdf8" className="node-tw" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </g>

        {/* 中央コア */}
        <circle cx="160" cy="160" r="26" fill="url(#core)" className="svg-center core-pulse" />
        <circle cx="160" cy="160" r="7" fill="#ccfbf1" />
        <circle cx="160" cy="160" r="7" fill="none" stroke="#ccfbf1" strokeOpacity="0.6" strokeWidth="1" className="svg-center halo-pulse" />
      </svg>
      <p className="mt-1 text-center text-[11px] uppercase tracking-[0.28em] text-teal-300/70">
        {active ? 'Generating…' : 'Engine Live'}
      </p>
    </div>
  );
}

// ===== 背景パーティクル（浮遊するデータ点） =====
const PARTICLES = [
  { l: 8, t: 18, s: 3, d: 0, dur: 7 },
  { l: 22, t: 62, s: 2, d: 1.4, dur: 9 },
  { l: 35, t: 12, s: 2, d: 0.6, dur: 8 },
  { l: 48, t: 78, s: 3, d: 2.2, dur: 10 },
  { l: 61, t: 28, s: 2, d: 0.9, dur: 7.5 },
  { l: 73, t: 66, s: 3, d: 1.8, dur: 9.5 },
  { l: 85, t: 20, s: 2, d: 0.3, dur: 8.5 },
  { l: 92, t: 54, s: 2, d: 2.6, dur: 7 },
  { l: 15, t: 88, s: 2, d: 1.1, dur: 9 },
  { l: 42, t: 44, s: 2, d: 3, dur: 11 },
  { l: 55, t: 90, s: 3, d: 0.5, dur: 8 },
  { l: 68, t: 8, s: 2, d: 2, dur: 10 },
  { l: 80, t: 82, s: 2, d: 1.5, dur: 9 },
  { l: 5, t: 46, s: 2, d: 0.8, dur: 7.5 },
  { l: 30, t: 34, s: 2, d: 2.4, dur: 8.5 },
  { l: 95, t: 74, s: 3, d: 1.2, dur: 10 }
];

function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="floaty absolute rounded-full bg-teal-300/60"
          style={{
            left: `${p.l}%`,
            top: `${p.t}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
            boxShadow: '0 0 8px 1px rgba(94, 234, 212, 0.6)',
            animationDelay: `${p.d}s`,
            animationDuration: `${p.dur}s`,
            opacity: 0.5
          }}
        />
      ))}
    </div>
  );
}

// スコアカード
function ArticleScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">
        <span className="gradient-text">{value}</span>
        <span className="ml-1 text-sm font-normal text-slate-500">/ 100</span>
      </p>
    </div>
  );
}

// 定義リスト行
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 flex-none text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{label}</dt>
      <dd className="flex-1 text-slate-300">{value}</dd>
    </div>
  );
}
