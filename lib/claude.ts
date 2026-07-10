import Anthropic from '@anthropic-ai/sdk';
import { UrlData } from './types';

// 記事生成に使うモデル。既定は Claude Fable 5。
// 環境変数 AIO_MODEL で上書き可（例: claude-opus-4-8）。
const MODEL = process.env.AIO_MODEL || 'claude-fable-5';

// Fable 5 / Mythos 5 系かどうか（thinking常時ON・サーバーサイドfallback対応）
const IS_FABLE_FAMILY = MODEL.startsWith('claude-fable') || MODEL.startsWith('claude-mythos');

// Fable系でsafety classifierに拒否された場合の切替先
const FALLBACK_MODEL = 'claude-opus-4-8';

// ANTHROPIC_API_KEY があるときだけ実クライアントを返す。未設定時は null。
export function getClaudeClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  return new Anthropic();
}

export function isClaudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// textブロックだけを連結（beta/非betaどちらのブロック型でも扱えるよう緩く型付け）
function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n')
    .trim();
}

type MessageParams = {
  max_tokens: number;
  system: string;
  user: string;
  thinking?: Anthropic.ThinkingConfigParam;
  output_config?: Record<string, unknown>;
};

// 共通のメッセージ実行。Fable系ではサーバーサイドfallback＋refusal処理を付与し、
// 長い生成でもタイムアウトしないようストリーミングで最終メッセージを取得する。
async function runMessage(params: MessageParams): Promise<string> {
  const client = getClaudeClient();
  if (!client) {
    throw new Error('ANTHROPIC_API_KEY が設定されていません。');
  }

  const messages = [{ role: 'user' as const, content: params.user }];

  if (IS_FABLE_FAMILY) {
    // fallbacks は新しいbeta機能でSDK型に未反映のことがあるため緩く型付けする
    const request = {
      model: MODEL,
      max_tokens: params.max_tokens,
      betas: ['server-side-fallback-2026-06-01'],
      fallbacks: [{ model: FALLBACK_MODEL }],
      thinking: params.thinking,
      output_config: params.output_config,
      system: params.system,
      messages,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = client.beta.messages.stream(request as any);
    const res = await stream.finalMessage();
    // fallback先でも拒否された場合は refusal で返る
    if (res.stop_reason === 'refusal') {
      throw new Error('safety classifierにより生成が拒否されました。');
    }
    return extractText(res.content);
  }

  const request = {
    model: MODEL,
    max_tokens: params.max_tokens,
    thinking: params.thinking,
    output_config: params.output_config,
    system: params.system,
    messages,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = client.messages.stream(request as any);
  const res = await stream.finalMessage();
  if (res.stop_reason === 'refusal') {
    throw new Error('safety classifierにより生成が拒否されました。');
  }
  return extractText(res.content);
}

// URL解析結果を踏まえて、Claudeで実際にAIO記事を生成する
export async function generateArticleWithClaude(params: {
  keyword: string;
  industry: string;
  articleType: string;
  urlData: UrlData;
}): Promise<string> {
  const { keyword, industry, articleType, urlData } = params;

  const system = [
    'あなたは日本語のSEO・AIO（AI Optimization）記事の専門ライターです。',
    'ChatGPTなどのAIによる引用（citation）とGoogle AI Overviewでの露出を最大化する記事を書きます。',
    '重視する原則:',
    '- E-E-A-T（経験・専門性・権威性・信頼性）を満たす具体的で一次情報的な記述',
    '- 結論ファースト。冒頭で要点を明確に提示する',
    '- 質問形の見出し（H2/H3）と、その直後に簡潔で引用しやすい要約文',
    '- 地域名・サービス名などのローカルSEOキーワードを自然に含める',
    '- FAQセクションを設け、想定質問に端的に回答する',
    '- 誇大表現・虚偽・断定的な効果保証は避け、薬機法・景表法に配慮する',
    '出力はMarkdown形式の記事本文のみ。前置きやメタ的な説明は書かない。',
  ].join('\n');

  const user = [
    `# 記事作成依頼`,
    `- キーワード: ${keyword}`,
    `- 業種: ${industry}`,
    `- 記事タイプ: ${articleType}`,
    ``,
    `## 参考にするサイト情報`,
    `- タイトル: ${urlData.title}`,
    `- 説明: ${urlData.description}`,
    `- 提供サービス: ${urlData.services.join('、')}`,
    `- 強み: ${urlData.strengths.join('、')}`,
    `- 対応地域: ${urlData.regions.join('、')}`,
    `- 料金の目安: ${urlData.pricing}`,
    `- 想定FAQ: ${urlData.faq.join(' / ')}`,
    `- CTA: ${urlData.cta}`,
    `- 既存の見出し候補: ${urlData.headings.join(' > ')}`,
    ``,
    `上記を踏まえ、${industry}向けの「${articleType}」として、`,
    `「${keyword}」で検索・質問するユーザーに刺さるAIO最適化記事をMarkdownで書いてください。`,
    `構成の目安: 結論 → 読者の悩み → 解決策 → 専門的な解説 → 具体例（地域事例含む） → FAQ → CTA。`,
  ].join('\n');

  const text = await runMessage({
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    system,
    user,
  });
  if (!text) {
    throw new Error('Claudeから記事本文を取得できませんでした。');
  }
  return text;
}

export type AioScore = {
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

// 診断結果のJSONスキーマ（structured outputsで形式を強制）
const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    aioScore: { type: 'integer', description: 'AIO最適化度 0-100' },
    eeatScore: { type: 'integer', description: 'E-E-A-T（経験/専門性/権威性/信頼性）0-100' },
    expertiseScore: { type: 'integer', description: '専門性・一次情報性 0-100' },
    faqScore: { type: 'integer', description: 'FAQの網羅性と回答の的確さ 0-100' },
    schemaScore: { type: 'integer', description: '構造化データ/見出し構造への適合 0-100' },
    originalityScore: { type: 'integer', description: '独自性・差別化 0-100' },
    shareabilityScore: { type: 'integer', description: 'AIに引用・要約されやすい構造か 0-100' },
    localSeoScore: { type: 'integer', description: '地域SEO（地名・商圏キーワードの活用）0-100' },
    ctaScore: { type: 'integer', description: 'CTAの明確さ・導線 0-100' },
    summary: { type: 'string', description: '全体総評を日本語で2-3文' },
    strengths: {
      type: 'array',
      description: 'AIに引用されやすい強み・良い点を2-4個',
      items: { type: 'string' },
    },
    improvements: {
      type: 'array',
      description: 'スコアの低い観点を優先した、実行可能で具体的な改善アクションを3-5個（優先度順）',
      items: { type: 'string' },
    },
  },
  required: [
    'aioScore',
    'eeatScore',
    'expertiseScore',
    'faqScore',
    'schemaScore',
    'originalityScore',
    'shareabilityScore',
    'localSeoScore',
    'ctaScore',
    'summary',
    'strengths',
    'improvements',
  ],
  additionalProperties: false,
} as const;

// Claudeで記事のAIOスコアを診断する（精緻化版：観点別ルーブリック＋強み＋優先改善）
export async function diagnoseArticleWithClaude(params: {
  content: string;
  keyword: string;
  industry: string;
  articleType: string;
}): Promise<AioScore> {
  const { content, keyword, industry, articleType } = params;

  const system = [
    'あなたはAIO/SEO記事の評価者です。',
    '与えられた記事を、AIによる引用のされやすさ（ChatGPT等のcitation）とGoogle AI Overview露出の観点で厳密に採点します。',
    '各指標は0-100の整数で、以下のルーブリックに基づき根拠を持って辛めに評価してください:',
    '- aioScore: 結論ファースト・要点の明快さ・AIが答えを抽出しやすい構造か',
    '- eeatScore: 経験/専門性/権威性/信頼性を示す具体的記述・出典・実績の有無',
    '- expertiseScore: 一次情報性、表面的でない専門的深さ',
    '- faqScore: 想定質問の網羅と、端的で引用可能な回答',
    '- schemaScore: 見出し階層の適切さ、FAQ/構造化データ化しやすい形か',
    '- originalityScore: テンプレ的でない独自の切り口・差別化',
    '- shareabilityScore: 質問形見出し＋直後の要約など、AIが要約・引用しやすい構造',
    '- localSeoScore: 地名・商圏・サービス名などローカルキーワードの自然な活用',
    '- ctaScore: 次アクションへの導線の明確さ',
    'summary は全体総評を2-3文。strengths は引用されやすい強みを2-4個。',
    'improvements は、最もスコアの低い観点を優先した実行可能な改善アクションを3-5個、優先度順に。',
    '各improvementは「何を・どう直すか」が分かる具体的な指示にすること（抽象論は避ける）。',
  ].join('\n');

  const user = [
    `## 評価対象`,
    `- キーワード: ${keyword}`,
    `- 業種: ${industry}`,
    `- 記事タイプ: ${articleType}`,
    ``,
    `## 記事本文`,
    content,
  ].join('\n');

  const text = await runMessage({
    max_tokens: 6000,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SCORE_SCHEMA },
    },
    system,
    user,
  });

  const parsed = JSON.parse(text) as AioScore;
  return parsed;
}
