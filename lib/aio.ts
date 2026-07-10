import { UrlData } from './types';
import {
  isClaudeEnabled,
  generateArticleWithClaude,
  diagnoseArticleWithClaude,
  AioScore,
} from './claude';

// URLからフォールバック用のモックデータを組み立てる
function buildFallbackUrlData(url: string): UrlData {
  const normalized = url.replace(/https?:\/\//, '').replace(/\/.*$/, '');
  return {
    title: `AIO向けサービス | ${normalized}`,
    description: `こちらは${normalized}の公式サイトを元にしたサービス紹介ページです。`,
    services: ['プラン設計', '地域SEO対策', 'コンテンツ制作'],
    companyInfo: `${normalized}を運営する専門企業です。`,
    strengths: ['専門性の高い提案', '地域密着型の対応', 'SEOに強い記事制作'],
    regions: ['東京', '大阪', '名古屋'],
    pricing: '¥99,000〜',
    faq: ['相談は無料ですか？', '対応エリアはどこですか？', '納期はどのくらいですか？'],
    cta: '今すぐ無料相談を申し込む',
    existingArticles: ['導入事例', 'サービス紹介', 'よくある質問'],
    internalLinks: ['/service', '/price', '/contact'],
    headings: ['サービス概要', '選ばれる理由', '料金プラン', 'FAQ', 'お問い合わせ']
  };
}

// 対象URLを実際にfetchしてHTMLから情報を抽出する（失敗時はフォールバックを返し、例外は投げない）
export async function extractUrlData(url: string): Promise<UrlData> {
  const fallback = buildFallbackUrlData(url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return fallback;
    }
    const html = await response.text();

    // <title>タグの中身を抽出
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch && titleMatch[1].trim() ? titleMatch[1].trim() : fallback.title;

    // <meta name="description" content="..."> を抽出（属性順の違いにも対応）
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
    const description = descMatch && descMatch[1].trim() ? descMatch[1].trim() : fallback.description;

    // <h1>〜<h3>のテキストを最大8件抽出（HTMLタグを除去、trim、空は除外）
    const headingMatches = html.match(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi) || [];
    const headings = headingMatches
      .map((tag) => tag.replace(/<[^>]*>/g, '').trim())
      .filter((text) => text.length > 0)
      .slice(0, 8);

    return {
      ...fallback,
      title,
      description,
      headings: headings.length > 0 ? headings : fallback.headings
    };
  } catch {
    // fetch失敗時は必ずモックデータを返す
    return fallback;
  }
}

// テンプレートによる簡易記事生成（APIキー未設定時・生成失敗時のフォールバック）
function generateTemplateArticle(params: { keyword: string; industry: string; articleType: string; urlData: UrlData }): string {
  const { keyword, industry, articleType, urlData } = params;
  const intro = `${keyword}でお探しの方へ。${industry}の専門家が、${articleType}に最適なコンテンツをお届けします。`;
  const problem = `多くの企業が抱える課題は、専門性のある情報を適切な形で伝えきれないことです。`;
  const solution = `そこで、${industry}に特化した記事構成を用いて、読者の悩みを解決するコンテンツを作成します。`;
  const expert = `専門的には、見出し構成・FAQ・地域キーワードを同時に最適化することが重要です。`;
  const examples = `例えば、${urlData.regions[0]}や${urlData.regions[1]}の事例を挙げながら、具体的な施策を紹介します。`;
  const faq = `Q. ${urlData.faq[0]}\nA. 無料相談は常時受け付けています。\nQ. 対応エリアはどこですか？\nA. ${urlData.regions.join('、')}を中心に対応します。`;
  const cta = `今すぐ${keyword}について相談して、${industry}に強いコンテンツを手に入れましょう。`;

  return [
    '結論',
    intro,
    '読者の悩み',
    problem,
    '解決策',
    solution,
    '専門的な解説',
    expert,
    '具体例',
    examples,
    'FAQ',
    faq,
    'CTA',
    cta
  ].join('\n\n');
}

export async function generateArticle(params: { keyword: string; industry: string; articleType: string; urlData?: UrlData }): Promise<{ article: string; urlData: UrlData; faqSchema: string; engine: 'claude' | 'template' }> {
  const urlData = params.urlData || (await extractUrlData('https://example.com'));

  // APIキーがあればClaudeで生成。失敗時はテンプレートにフォールバックする。
  let article: string;
  let engine: 'claude' | 'template' = 'template';
  if (isClaudeEnabled()) {
    try {
      article = await generateArticleWithClaude({
        keyword: params.keyword,
        industry: params.industry,
        articleType: params.articleType,
        urlData,
      });
      engine = 'claude';
    } catch (error) {
      console.error('Claude記事生成に失敗、テンプレートにフォールバックします:', error);
      article = generateTemplateArticle({ ...params, urlData });
    }
  } else {
    article = generateTemplateArticle({ ...params, urlData });
  }

  // urlData.faq を元にFAQPageのJSON-LD文字列を生成
  const faqSchema = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: urlData.faq.map((question) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'お問い合わせください。'
        }
      }))
    },
    null,
    2
  );

  return { article, urlData, faqSchema, engine };
}

// 文字数ベースの簡易診断（フォールバック用）
function diagnoseTemplate(params: { content: string; keyword: string; industry: string; articleType: string }): AioScore {
  const base = Math.min(90, Math.max(50, Math.floor(params.content.length / 40)));
  return {
    aioScore: base,
    eeatScore: Math.min(100, base + 5),
    expertiseScore: Math.min(96, base + 2),
    faqScore: params.content.includes('FAQ') ? 78 : 65,
    schemaScore: 70,
    originalityScore: 72,
    shareabilityScore: 68,
    localSeoScore: params.keyword.includes('東京') ? 84 : 72,
    ctaScore: params.content.includes('今すぐ') ? 80 : 68,
    summary: '簡易診断（APIキー未設定）による概算スコアです。実評価にはAPIキーを設定してください。',
    strengths: ['基本的な記事構成が揃っている', 'FAQ・CTAの要素を含む'],
    improvements: [
      '質問形の見出しと直後の要約を追加し、AIが引用しやすい構造にする',
      '地域名・商圏キーワードを具体事例に盛り込みローカルSEOを強化する',
      '一次情報や実績・出典を加えてE-E-A-Tを高める'
    ]
  };
}

export async function diagnoseArticle(params: { content: string; keyword: string; industry: string; articleType: string }): Promise<{ score: AioScore; engine: 'claude' | 'template' }> {
  if (isClaudeEnabled()) {
    try {
      const score = await diagnoseArticleWithClaude(params);
      return { score, engine: 'claude' };
    } catch (error) {
      console.error('Claude診断に失敗、簡易診断にフォールバックします:', error);
    }
  }
  return { score: diagnoseTemplate(params), engine: 'template' };
}

export async function sendToWordpress(params: { title: string; content: string; keywords: string; articleType: string }) {
  const siteUrl = process.env.WP_SITE_URL;
  const username = process.env.WP_USERNAME;
  const password = process.env.WP_PASSWORD;
  const token = process.env.WP_API_TOKEN;

  if (!siteUrl) {
    return { success: false, message: 'WordPressのサイトURLが設定されていません。' };
  }

  const endpoint = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (username && password) {
    const basic = Buffer.from(`${username}:${password}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  } else {
    return { success: false, message: 'WordPressの認証情報が設定されていません。' };
  }

  const body = {
    title: params.title,
    content: params.content,
    status: 'draft',
    excerpt: `${params.keywords}に最適化されたAIO記事です。`
  };

  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) {
    return { success: false, message: `投稿失敗: ${result.message ?? response.statusText}` };
  }
  return { success: true, message: `WordPress投稿が完了しました。ID: ${result.id}` };
}
