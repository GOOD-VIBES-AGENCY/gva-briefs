// =============================================
// GVA タイアップ依頼ページ 自動生成スクリプト
// =============================================
// セットアップ手順:
// 1. このスクリプトをGoogleフォームに紐づいたスプレッドシートのApps Scriptに貼り付け
// 2. GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO を設定
// 3. フォームの送信トリガーを onFormSubmit に設定
// =============================================

// ── 設定 ──────────────────────────────────────
// ⚠️ トークンはスクリプトプロパティに保存してください
// Apps Script エディタ > プロジェクトの設定 > スクリプトプロパティ に追加:
//   GITHUB_TOKEN = ghp_xxxx...
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    GITHUB_TOKEN:   props.getProperty('GITHUB_TOKEN') || '',
    GITHUB_OWNER:  'GOOD-VIBES-AGENCY',
    GITHUB_REPO:   'gva-briefs',
    PAGES_BASE_URL: 'https://good-vibes-agency.github.io/gva-briefs',
    NOTIFY_EMAIL:  '' // 完了通知を送るメールアドレス（空欄でスキップ）
  };
}

// ── メイン処理（フォーム送信トリガー） ──────────
function onFormSubmit(e) {
  try {
    const responses = getFormResponses(e);
    const slug = generateSlug(responses);
    const html = buildHtml(responses);
    const filePath = 'briefs/' + slug + '/index.html';
    const pageUrl = getConfig().PAGES_BASE_URL + '/briefs/' + slug + '/';

    // GitHubにプッシュ
    pushToGitHub(filePath, html, '✨ Add brief: ' + responses['ページタイトル']);

    // indexページを更新
    updateIndex(responses, slug, pageUrl);

    // 完了メール（設定済みの場合）
    if (getConfig().NOTIFY_EMAIL) {
      GmailApp.sendEmail(
        getConfig().NOTIFY_EMAIL,
        '【GVA】依頼ページ生成完了: ' + responses['ページタイトル'],
        '依頼ページが生成されました。\n\nURL: ' + pageUrl
      );
    }

    // スプレッドシートのセルにURLを記入
    writeUrlToSheet(e, pageUrl);

    Logger.log('✅ 生成完了: ' + pageUrl);
  } catch (err) {
    Logger.log('❌ エラー: ' + err.message);
    throw err;
  }
}

// ── フォーム回答を取得 ──────────────────────────
function getFormResponses(e) {
  const sheet = e.range.getSheet();
  const row   = e.range.getRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values  = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  const res = {};
  headers.forEach((h, i) => { res[h] = values[i] || ''; });
  return res;
}

// ── URLに使えるスラグを生成 ────────────────────
function generateSlug(responses) {
  const brand = responses['ブランド名'] || 'brand';
  const now   = new Date();
  const yymm  = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM');
  const slug  = (brand + '-' + yymm)
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'brief-' + now.getTime();
}

// ── HTML生成 ──────────────────────────────────
function buildHtml(r) {
  let html = TEMPLATE;

  // 基本情報
  html = html.replace(/{{PAGE_TITLE}}/g,       esc(r['ページタイトル'] || 'タイアップのご依頼'));
  html = html.replace(/{{MONTH_LABEL}}/g,       esc(r['月度ラベル'] || ''));
  html = html.replace(/{{PRODUCT_URL}}/g,       esc(r['商品公式サイトURL'] || '#'));
  html = html.replace(/{{REQUEST_DESCRIPTION}}/g, escNl(r['お願いしたいこと（説明）'] || '商品をお試しいただき、Instagramへの投稿をお願いいたします。'));

  // 案件概要
  html = html.replace(/{{POSTING_PERIOD}}/g,    escNl(r['投稿期間（テキスト）'] || ''));
  html = html.replace(/{{DEADLINE}}/g,          esc(r['応募締切'] || ''));
  html = html.replace(/{{PLATFORMS}}/g,         escNl(r['投稿媒体'] || 'Instagram'));
  html = html.replace(/{{POST_CONTENT}}/g,      escNl(r['投稿内容'] || '商品の使用感・日常ケアシーン'));
  html = html.replace(/{{REWARD}}/g,            esc(r['報酬（商品名・金額）'] || '商品無償提供'));

  // 商品情報
  html = html.replace(/{{PRODUCT_DESCRIPTION}}/g, escNl(r['商品説明テキスト'] || ''));
  html = html.replace(/{{PRODUCT_NAME_SPEC}}/g, escNl(r['商品名（表記）'] || ''));
  html = html.replace(/{{PRODUCT_VOLUME}}/g,    esc(r['容量・内容量'] || ''));
  html = html.replace(/{{PRODUCT_PRICE}}/g,     esc(r['販売価格'] || ''));
  html = html.replace(/{{PRODUCT_SALES_CHANNELS}}/g, escNl(r['販売先'] || ''));

  // こんな人にオススメ（改行区切りで入力）
  const recommendRaw = r['こんな人にオススメ（改行区切り）'] || '';
  html = html.replace(/{{RECOMMEND_HTML}}/g, buildRecommendHtml(recommendRaw));

  // FAQ（Q1,A1,Q2,A2...の形式）
  html = html.replace(/{{FAQ_HTML}}/g, buildFaqHtml(r));

  // NG事項（改行区切り）
  const ngRaw = r['NG事項（改行区切り）'] || '';
  html = html.replace(/{{NG_ITEMS_HTML}}/g, buildNgHtml(ngRaw));

  // キャプション・タグ
  html = html.replace(/{{REQUIRED_CAPTION}}/g,  esc(r['必須キャプション'] || ''));
  html = html.replace(/{{HASHTAGS_HTML}}/g,      buildHashtagsHtml(r['必須ハッシュタグ（スペース区切り）'] || ''));
  html = html.replace(/{{ACCOUNT_TAGS_HTML}}/g,  buildAccountTagsHtml(r));

  // Xリンク（任意）
  const xLink = r['X投稿用リンク（任意）'] || '';
  html = html.replace(/{{X_LINK_HTML}}/g, xLink ? buildXLinkHtml(xLink) : '');

  // 過去の投稿例（形式：プラットフォーム名|説明|URL を改行区切り）
  html = html.replace(/{{POST_EXAMPLES_HTML}}/g, buildPostExamplesHtml(r['過去の投稿例（改行区切り）'] || ''));

  // 配送フォーム
  html = html.replace(/{{DELIVERY_FORM_URL}}/g, esc(r['配送フォームURL'] || '#'));

  // お問い合わせ（Instagram|handle を改行区切り）
  html = html.replace(/{{CONTACT_HTML}}/g, buildContactHtml(r['お問い合わせ先（改行区切り）'] || ''));

  return html;
}

// ── ヘルパー関数群 ─────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escNl(str) {
  return esc(str).replace(/\n/g, '<br>');
}

function buildRecommendHtml(raw) {
  if (!raw.trim()) return '';
  const items = raw.split('\n').filter(s => s.trim());
  const liHtml = items.map(item => '<li>' + esc(item.replace(/^[・✔️\-\*]+\s*/, '')) + '</li>').join('\n');
  return `
    <div class="recommend-list">
      <div class="label">こんな人にオススメ！</div>
      <ul>${liHtml}</ul>
    </div>`;
}

function buildFaqHtml(r) {
  const faqs = [];
  for (let i = 1; i <= 10; i++) {
    const q = r['FAQ質問' + i] || r['FAQ Q' + i] || '';
    const a = r['FAQ回答' + i] || r['FAQ A' + i] || '';
    if (q && a) faqs.push({ q, a });
  }
  if (faqs.length === 0) return '';

  const itemsHtml = faqs.map(f =>
    `<div class="faq-item">
       <div class="faq-q">${esc(f.q)}</div>
       <div class="faq-a">${escNl(f.a)}</div>
     </div>`
  ).join('\n');

  return `
    <div class="section">
      <div class="section-title">
        <div class="icon">❓</div>
        よくある質問
      </div>
      <div class="faq-list">${itemsHtml}</div>
    </div>`;
}

function buildNgHtml(raw) {
  if (!raw.trim()) return '<li>（なし）</li>';
  return raw.split('\n').filter(s => s.trim())
    .map(item => '<li>' + esc(item.replace(/^[・🚫\-\*]+\s*/, '')) + '</li>')
    .join('\n');
}

function buildHashtagsHtml(raw) {
  if (!raw.trim()) return '';
  return raw.split(/[\s\n]+/).filter(s => s.trim())
    .map(tag => {
      const t = tag.startsWith('#') ? tag : '#' + tag;
      return `<span class="hashtag">${esc(t)}</span>`;
    }).join(' ');
}

function buildAccountTagsHtml(r) {
  const platforms = [
    { key: 'Instagramアカウントタグ', label: 'Instagram' },
    { key: 'TikTokアカウントタグ',    label: 'TikTok'    },
    { key: 'Xアカウントタグ',         label: 'X'         }
  ];
  return platforms
    .filter(p => r[p.key])
    .map(p => `<div><small style="color:var(--light);font-size:11px">${p.label}：</small><strong>${esc(r[p.key])}</strong></div>`)
    .join('\n') || '（未設定）';
}

function buildXLinkHtml(link) {
  return `
    <div class="section">
      <div class="section-title">
        <div class="icon">🔗</div>
        投稿設置リンク（Xの方のみ）
      </div>
      <p style="font-size:13px;color:var(--mid);margin-bottom:12px">
        ツリー形式（リプ欄）にリンクを貼ってください🙇‍♀️
      </p>
      <div class="link-block">
        <a href="${esc(link)}" target="_blank">${esc(link)}</a>
        <button class="copy-hint" onclick="navigator.clipboard.writeText('${esc(link)}');this.textContent='✓ コピー済'">📋 コピー</button>
      </div>
    </div>`;
}

function buildPostExamplesHtml(raw) {
  if (!raw.trim()) return '';
  // 形式: "プラットフォーム|説明|URL"（改行区切り）
  const items = raw.split('\n').filter(s => s.trim());
  if (items.length === 0) return '';

  const exHtml = items.map(line => {
    const parts = line.split('|');
    const platform = parts[0] ? parts[0].trim() : '';
    const desc     = parts[1] ? parts[1].trim() : '';
    const url      = parts[2] ? parts[2].trim() : '';
    return `
      <div class="post-example">
        <div class="platform-badge">${esc(platform)}</div>
        <p class="desc">${esc(desc)}</p>
        ${url ? `<a href="${esc(url)}" target="_blank">👉 投稿を見る</a>` : ''}
      </div>`;
  }).join('\n');

  return `
    <div class="section">
      <div class="section-title">
        <div class="icon">✨</div>
        過去の投稿例
      </div>
      <p style="font-size:13px;color:var(--mid);margin-bottom:14px">
        投稿スタイルは自由です。あくまで参考例としてご覧ください！
      </p>
      ${exHtml}
    </div>`;
}

function buildContactHtml(raw) {
  if (!raw.trim()) return '';
  // 形式: "プラットフォーム|URL/handle"（改行区切り）
  const platformIcons = { Instagram: '📸', X: '🐦', TikTok: '🎵', LINE: '💬' };
  return raw.split('\n').filter(s => s.trim()).map(line => {
    const parts    = line.split('|');
    const platform = parts[0] ? parts[0].trim() : '';
    const url      = parts[1] ? parts[1].trim() : '';
    const icon     = platformIcons[platform] || '📨';
    const href     = url.startsWith('http') ? url : '#';
    return `
      <a class="contact-item" href="${esc(href)}" target="_blank">
        <span style="font-size:22px">${icon}</span>
        <div>
          <div class="platform">${esc(platform)}</div>
          <div class="handle">${esc(url)}</div>
        </div>
      </a>`;
  }).join('\n');
}

// ── GitHub API ────────────────────────────────
function pushToGitHub(path, content, message) {
  const url = `https://api.github.com/repos/${getConfig().GITHUB_OWNER}/${getConfig().GITHUB_REPO}/contents/${path}`;

  // 既存ファイルのSHAを取得（更新時に必要）
  let sha = '';
  try {
    const existing = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'token ' + getConfig().GITHUB_TOKEN },
      muteHttpExceptions: true
    });
    if (existing.getResponseCode() === 200) {
      sha = JSON.parse(existing.getContentText()).sha;
    }
  } catch(e) {}

  const payload = {
    message: message,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8)
  };
  if (sha) payload.sha = sha;

  const res = UrlFetchApp.fetch(url, {
    method:  'PUT',
    headers: {
      Authorization:  'token ' + getConfig().GITHUB_TOKEN,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub API エラー (' + code + '): ' + res.getContentText());
  }
}

// ── index.html を更新 ─────────────────────────
function updateIndex(r, slug, pageUrl) {
  const indexPath = 'index.html';
  const indexUrl  = `https://api.github.com/repos/${getConfig().GITHUB_OWNER}/${getConfig().GITHUB_REPO}/contents/${indexPath}`;

  // 現在のindexを取得
  let currentContent = '';
  let sha = '';
  try {
    const existing = UrlFetchApp.fetch(indexUrl, {
      headers: { Authorization: 'token ' + getConfig().GITHUB_TOKEN },
      muteHttpExceptions: true
    });
    if (existing.getResponseCode() === 200) {
      const data = JSON.parse(existing.getContentText());
      sha = data.sha;
      currentContent = Utilities.newBlob(Utilities.base64Decode(data.content)).getDataAsString();
    }
  } catch(e) {}

  // 新しいカードを追加
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  const deliveryUrl = getConfig().PAGES_BASE_URL + '/briefs/' + slug + '/delivery.html';
  const newCard = `
    <div class="brief-card" data-slug="${slug}">
      <div class="brief-meta">${esc(now)} ／ ${esc(r['ブランド名'] || '')}</div>
      <div class="brief-title">${esc(r['ページタイトル'] || '')}</div>
      <div class="brief-actions">
        <a href="${esc(pageUrl)}" class="brief-link" target="_blank">📋 依頼ページ</a>
        <a href="${esc(deliveryUrl)}" class="brief-link delivery" target="_blank">📦 配送フォーム</a>
      </div>
    </div>`;

  if (currentContent.includes('<!-- BRIEFS_LIST -->')) {
    currentContent = currentContent.replace('<!-- BRIEFS_LIST -->', newCard + '\n    <!-- BRIEFS_LIST -->');
  } else {
    currentContent = buildIndexHtml(newCard);
  }

  pushToGitHub(indexPath, currentContent, '📋 Update index: ' + r['ページタイトル']);
}

// ── スプレッドシートにURLを書き込む ──────────────
function writeUrlToSheet(e, url) {
  try {
    const sheet = e.range.getSheet();
    const row   = e.range.getRow();
    const lastCol = sheet.getLastColumn() + 1;
    // ヘッダー行に「生成ページURL」がなければ追加
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let urlCol = headers.indexOf('生成ページURL') + 1;
    if (urlCol === 0) {
      sheet.getRange(1, lastCol).setValue('生成ページURL');
      urlCol = lastCol;
    }
    sheet.getRange(row, urlCol).setValue(url);
  } catch(e) {
    Logger.log('URL書き込みエラー: ' + e.message);
  }
}

// ── index.html の初期テンプレート ────────────────
function buildIndexHtml(firstCard) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GVA タイアップ依頼ページ一覧</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#FDFAF6; font-family:'Noto Sans JP',sans-serif; padding:40px 16px; }
    .header { max-width:720px; margin:0 auto 32px; }
    .header h1 { font-size:22px; font-weight:700; color:#2D2D2D; margin-bottom:6px; }
    .header p { font-size:13px; color:#9E9896; }
    .grid { max-width:720px; margin:0 auto; display:grid; gap:12px; }
    .brief-card {
      background:white; border:1px solid #E8DDD8; border-radius:14px;
      padding:18px 20px; display:flex; flex-direction:column; gap:8px;
    }
    .brief-meta { font-size:11px; color:#9E9896; letter-spacing:0.05em; }
    .brief-title { font-size:15px; font-weight:700; color:#2D2D2D; }
    .brief-link {
      display:inline-flex; align-items:center; gap:5px;
      background:#F2E8E1; color:#B85C52; font-size:12px; font-weight:600;
      padding:6px 14px; border-radius:7px; text-decoration:none; width:fit-content;
      transition:all 0.2s;
    }
    .brief-link:hover { background:#e0cec8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 タイアップ依頼ページ一覧</h1>
    <p>GOOD VIBES AGENCY — 自動生成されたタイアップ依頼ページ</p>
  </div>
  <div class="grid">
    ${firstCard}
    <!-- BRIEFS_LIST -->
  </div>
</body>
</html>`;
}

// ── HTMLテンプレート文字列 ────────────────────────
// （別ファイルにしても良いが、デプロイ簡略化のためここに含む）
const TEMPLATE = \`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PAGE_TITLE}} | GVA</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
  <style>
    :root{--cream:#FDFAF6;--warm-white:#FAF7F2;--blush:#F2E8E1;--rose:#D4837A;--rose-deep:#B85C52;--gold:#C9A96E;--charcoal:#2D2D2D;--mid:#6B6260;--light:#9E9896;--border:#E8DDD8;--section-bg:#FBF8F5;}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:var(--cream);color:var(--charcoal);font-family:'Noto Sans JP',sans-serif;font-size:14px;line-height:1.8;}
    .header{background:linear-gradient(135deg,#2D2D2D 0%,#1a1a1a 100%);padding:0;position:relative;overflow:hidden;}
    .header::before{content:'';position:absolute;top:-50%;right:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(212,131,122,0.15) 0%,transparent 70%);pointer-events:none;}
    .header-inner{max-width:720px;margin:0 auto;padding:48px 24px 40px;position:relative;}
    .gva-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:4px 14px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:20px;}
    .gva-badge::before{content:'';width:6px;height:6px;background:var(--rose);border-radius:50%;}
    .header h1{font-size:clamp(20px,5vw,28px);font-weight:700;color:#fff;line-height:1.5;letter-spacing:0.02em;margin-bottom:8px;}
    .header-sub{color:rgba(255,255,255,0.45);font-size:12px;letter-spacing:0.08em;}
    .container{max-width:720px;margin:0 auto;padding:0 16px 80px;}
    .intro-card{background:white;border-radius:16px;padding:28px;margin:24px 0;border:1px solid var(--border);box-shadow:0 2px 16px rgba(0,0,0,0.04);}
    .intro-card p{color:var(--mid);font-size:14px;line-height:1.9;margin-bottom:16px;}
    .intro-card p:last-child{margin-bottom:0;}
    .product-link{display:inline-flex;align-items:center;gap:8px;background:var(--blush);border-radius:8px;padding:10px 16px;font-size:13px;color:var(--rose-deep);text-decoration:none;font-weight:500;word-break:break-all;}
    .product-link::before{content:'🔗';font-size:14px;}
    .section{margin:20px 0;}
    .section-title{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;color:var(--charcoal);margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--border);}
    .section-title .icon{width:32px;height:32px;background:var(--blush);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
    .summary-table{width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid var(--border);background:white;box-shadow:0 2px 12px rgba(0,0,0,0.04);}
    .summary-table tr:not(:last-child) td{border-bottom:1px solid var(--border);}
    .summary-table td{padding:14px 18px;font-size:13px;vertical-align:top;}
    .summary-table td:first-child{width:120px;background:var(--section-bg);font-weight:600;color:var(--mid);font-size:12px;letter-spacing:0.02em;white-space:nowrap;}
    .highlight-cell{color:var(--rose-deep)!important;font-weight:600!important;}
    .reward-badge{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#F2E8E1,#EDD9D0);border:1px solid #D4A59A;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;color:var(--rose-deep);}
    .product-card{background:white;border-radius:16px;padding:24px;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,0.04);}
    .product-desc{color:var(--mid);font-size:13px;line-height:1.9;margin-bottom:20px;white-space:pre-line;}
    .recommend-list{background:var(--section-bg);border-radius:10px;padding:16px 20px;margin-bottom:20px;}
    .recommend-list .label{font-size:12px;font-weight:700;color:var(--rose-deep);letter-spacing:0.05em;margin-bottom:10px;}
    .recommend-list li{list-style:none;font-size:13px;color:var(--charcoal);padding:4px 0;display:flex;align-items:flex-start;gap:8px;}
    .recommend-list li::before{content:'✔️';flex-shrink:0;margin-top:1px;}
    .specs-table{width:100%;border-collapse:collapse;border:1px solid var(--border);border-radius:10px;overflow:hidden;}
    .specs-table tr:not(:last-child) td{border-bottom:1px solid var(--border);}
    .specs-table td{padding:12px 16px;font-size:13px;}
    .specs-table td:first-child{width:110px;background:var(--section-bg);font-weight:600;color:var(--mid);font-size:12px;}
    .faq-list{display:flex;flex-direction:column;gap:10px;}
    .faq-item{background:white;border:1px solid var(--border);border-radius:12px;overflow:hidden;}
    .faq-q{padding:14px 18px;font-size:13px;font-weight:600;color:var(--charcoal);background:var(--section-bg);display:flex;align-items:flex-start;gap:8px;}
    .faq-q::before{content:'Q';background:var(--rose);color:white;font-size:11px;font-weight:700;width:20px;height:20px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
    .faq-a{padding:14px 18px;font-size:13px;color:var(--mid);line-height:1.8;display:flex;align-items:flex-start;gap:8px;}
    .faq-a::before{content:'A';background:var(--charcoal);color:white;font-size:11px;font-weight:700;width:20px;height:20px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
    .ng-list{background:#FFF5F5;border:1px solid #F5C0BC;border-radius:12px;padding:20px;}
    .ng-list li{list-style:none;font-size:13px;color:#8B3B38;padding:5px 0;display:flex;align-items:flex-start;gap:8px;border-bottom:1px solid #F5D5D3;}
    .ng-list li:last-child{border-bottom:none;padding-bottom:0;}
    .ng-list li::before{content:'🚫';flex-shrink:0;}
    .tags-card{background:white;border-radius:16px;border:1px solid var(--border);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);}
    .tag-row{display:flex;align-items:flex-start;border-bottom:1px solid var(--border);}
    .tag-row:last-child{border-bottom:none;}
    .tag-label{width:120px;flex-shrink:0;padding:14px 16px;font-size:12px;font-weight:600;color:var(--mid);background:var(--section-bg);border-right:1px solid var(--border);}
    .tag-value{padding:14px 16px;font-size:13px;color:var(--charcoal);flex:1;line-height:1.8;}
    .hashtag{display:inline-block;background:var(--blush);color:var(--rose-deep);border-radius:6px;padding:2px 10px;margin:2px 3px;font-size:12px;font-weight:500;}
    .copyable-block{background:var(--section-bg);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;position:relative;white-space:pre-line;}
    .copy-btn{position:absolute;top:8px;right:8px;background:var(--charcoal);color:white;border:none;border-radius:6px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:inherit;transition:all 0.2s;}
    .copy-btn:hover{background:var(--rose-deep);}
    .copy-btn.copied{background:#4CAF50;}
    .copy-hint{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--light);cursor:pointer;background:var(--blush);border:none;border-radius:6px;padding:3px 10px;margin-left:6px;transition:all 0.2s;font-family:inherit;}
    .link-block{background:white;border:1px solid var(--border);border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
    .link-block a{color:var(--rose-deep);font-size:13px;word-break:break-all;text-decoration:none;font-weight:500;}
    .post-example{background:white;border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:10px;}
    .post-example .platform-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--mid);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px;}
    .post-example .desc{font-size:13px;color:var(--mid);margin-bottom:10px;line-height:1.7;}
    .post-example a{display:inline-flex;align-items:center;gap:5px;background:var(--section-bg);border:1px solid var(--border);color:var(--rose-deep);font-size:12px;padding:6px 14px;border-radius:7px;text-decoration:none;transition:all 0.2s;}
    .flow-steps{display:flex;flex-direction:column;gap:0;}
    .flow-step{display:flex;align-items:flex-start;gap:16px;position:relative;padding-bottom:24px;}
    .flow-step:last-child{padding-bottom:0;}
    .flow-step::after{content:'';position:absolute;left:15px;top:32px;width:2px;height:calc(100% - 12px);background:var(--border);}
    .flow-step:last-child::after{display:none;}
    .step-num{width:32px;height:32px;background:var(--charcoal);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;position:relative;z-index:1;}
    .step-content{padding-top:5px;flex:1;}
    .step-content strong{font-size:14px;display:block;margin-bottom:4px;color:var(--charcoal);}
    .step-content p{font-size:13px;color:var(--mid);line-height:1.7;}
    .form-btn{display:inline-flex;align-items:center;gap:8px;background:var(--rose);color:white;text-decoration:none;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;margin-top:12px;transition:all 0.2s;box-shadow:0 4px 15px rgba(212,131,122,0.4);}
    .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .contact-item{background:white;border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;text-decoration:none;transition:all 0.2s;}
    .contact-item .platform{font-size:11px;font-weight:700;color:var(--light);letter-spacing:0.05em;}
    .contact-item .handle{font-size:13px;font-weight:600;color:var(--rose-deep);}
    .footer{text-align:center;padding:32px 16px;color:var(--light);font-size:12px;border-top:1px solid var(--border);margin-top:40px;}

    /* ── 編集パネル ── */
    .edit-fab{position:fixed;bottom:24px;right:24px;background:#1A1A1A;color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:16px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;z-index:100;transition:transform 0.2s;}
    .edit-fab:hover{transform:scale(1.1);}
    body.ep-open{overflow:hidden;}
    .edit-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:200;}
    body.ep-open .edit-overlay{display:block;}
    .edit-panel{position:fixed;top:0;right:-100%;width:min(480px,100%);height:100%;background:#fff;z-index:201;overflow-y:auto;transition:right 0.3s ease;box-shadow:-2px 0 20px rgba(0,0,0,0.12);}
    body.ep-open .edit-panel{right:0;}
    .ep-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #E0E0E0;position:sticky;top:0;background:#fff;z-index:1;}
    .ep-head h2{font-size:14px;font-weight:700;}
    .ep-xbtn{background:none;border:none;font-size:20px;cursor:pointer;color:#999;line-height:1;padding:4px;}
    .ep-body{padding:20px;}
    .ep-sec{font-size:10px;font-weight:700;color:#BBB;letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #F0F0F0;}
    .ep-f{margin-bottom:10px;}
    .ep-f label{display:block;font-size:11px;font-weight:700;color:#666;margin-bottom:3px;}
    .ep-f .r{color:#E53935;margin-left:2px;}
    .ep-f input,.ep-f textarea{width:100%;border:1px solid #E0E0E0;border-radius:5px;padding:8px 10px;font-size:13px;font-family:inherit;resize:vertical;background:#fff;color:#1A1A1A;}
    .ep-f input:focus,.ep-f textarea:focus{outline:none;border-color:#1A1A1A;}
    .ep-f textarea{min-height:64px;}
    .ep-f textarea.t{min-height:100px;}
    .ep-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .ep-faq{background:#F9F9F9;border:1px solid #E8E8E8;border-radius:6px;padding:10px;margin-bottom:6px;}
    .ep-faq-n{font-size:10px;font-weight:700;color:#CCC;margin-bottom:6px;letter-spacing:0.1em;text-transform:uppercase;}
    .ep-save{width:100%;background:#1A1A1A;color:#fff;border:none;border-radius:7px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:12px;transition:opacity 0.15s;}
    .ep-save:hover{opacity:0.82;}
    .ep-save:disabled{opacity:0.35;cursor:not-allowed;}
    .ep-status{text-align:center;padding:8px;font-size:12px;color:#555;min-height:24px;}
    @media(max-width:480px){.contact-grid{grid-template-columns:1fr;}.summary-table td:first-child{width:100px;}.tag-label{width:100px;}}
  </style>
</head>
<body>
<div class="header">
  <div class="header-inner">
    <div class="gva-badge">GOOD VIBES AGENCY</div>
    <h1>{{PAGE_TITLE}}</h1>
    <p class="header-sub">{{MONTH_LABEL}}</p>
  </div>
</div>
<div class="container">
  <div class="intro-card">
    <p>ご依頼を検討くださり、ありがとうございます✨<br>下記の内容をご確認のうえ、お受けいただける場合は<strong>DMへ「OK！🙆‍♀️」</strong>のご返信の上、フォームより配送先のご入力をお願いいたします。</p>
    <p>▼ 商品公式サイト</p>
    <a href="{{PRODUCT_URL}}" class="product-link" target="_blank">{{PRODUCT_URL}}</a>
  </div>
  <div class="section">
    <div class="section-title"><div class="icon">📱</div>お願いしたいこと</div>
    <div class="product-card"><p class="product-desc">{{REQUEST_DESCRIPTION}}</p></div>
  </div>
  <div class="section">
    <div class="section-title"><div class="icon">📋</div>案件概要</div>
    <table class="summary-table">
      <tr><td>📅 投稿期間</td><td>{{POSTING_PERIOD}}</td></tr>
      <tr><td>⏰ 応募締切</td><td class="highlight-cell">{{DEADLINE}}</td></tr>
      <tr><td>📱 投稿媒体</td><td>{{PLATFORMS}}</td></tr>
      <tr><td>📎 投稿内容</td><td>{{POST_CONTENT}}</td></tr>
      <tr><td>🎁 報酬</td><td><span class="reward-badge">{{REWARD}}</span></td></tr>
    </table>
  </div>
  <div class="section">
    <div class="section-title"><div class="icon">👀</div>商品情報</div>
    <div class="product-card">
      <p class="product-desc">{{PRODUCT_DESCRIPTION}}</p>
      {{RECOMMEND_HTML}}
      <table class="specs-table">
        <tr><td>商品名</td><td>{{PRODUCT_NAME_SPEC}}</td></tr>
        <tr><td>容量 / 内容量</td><td>{{PRODUCT_VOLUME}}</td></tr>
        <tr><td>販売価格</td><td>{{PRODUCT_PRICE}}</td></tr>
        <tr><td>販売先</td><td>{{PRODUCT_SALES_CHANNELS}}</td></tr>
      </table>
    </div>
  </div>
  {{FAQ_HTML}}
  <div class="section">
    <div class="section-title"><div class="icon">🚫</div>NG事項</div>
    <ul class="ng-list">{{NG_ITEMS_HTML}}</ul>
  </div>
  <div class="section">
    <div class="section-title"><div class="icon">🏷️</div>必要なキャプション・タグ</div>
    <div class="tags-card">
      <div class="tag-row">
        <div class="tag-label">📝 キャプション<br>（必須）</div>
        <div class="tag-value"><div class="copyable-block" id="caption-block">{{REQUIRED_CAPTION}}<button class="copy-btn" onclick="copyText('caption-block',this)">コピー</button></div></div>
      </div>
      <div class="tag-row">
        <div class="tag-label">＃ ハッシュタグ<br>（必須）</div>
        <div class="tag-value">{{HASHTAGS_HTML}}</div>
      </div>
      <div class="tag-row">
        <div class="tag-label">📱 アカウント<br>タグ付け（必須）</div>
        <div class="tag-value">{{ACCOUNT_TAGS_HTML}}</div>
      </div>
    </div>
  </div>
  {{X_LINK_HTML}}
  {{POST_EXAMPLES_HTML}}
  <div class="section">
    <div class="section-title"><div class="icon">📎</div>今後の流れ</div>
    <div class="flow-steps">
      <div class="flow-step"><div class="step-num">1</div><div class="step-content"><strong>配送フォームを入力して商品の到着を待つ 🎁</strong><p>フォームより配送先をご入力ください</p><a href="{{DELIVERY_FORM_URL}}" class="form-btn" target="_blank">📬 配送フォームはこちら</a></div></div>
      <div class="flow-step"><div class="step-num">2</div><div class="step-content"><strong>商品を試して投稿を作成 📱</strong><p>商品をご使用いただいたうえで、ご自身らしい投稿を作成してください</p></div></div>
      <div class="flow-step"><div class="step-num">3</div><div class="step-content"><strong>投稿完了後、GVAアカウントへ投稿リンクをDMで共有 👇</strong><p>投稿後にDMでリンクをお送りください</p></div></div>
      <div class="flow-step"><div class="step-num">4</div><div class="step-content"><strong>投稿後7日後にインサイトを共有 📬</strong><p>閲覧数・リンクタップ数などのインサイトをDMにてご共有をお願いします</p></div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title"><div class="icon">📬</div>お問い合わせ</div>
    <div class="contact-grid">{{CONTACT_HTML}}</div>
  </div>
</div>

<button class="edit-fab" id="edit-fab" title="依頼ページを編集">✏️</button>
<div class="edit-overlay" id="edit-overlay"></div>
<div class="edit-panel" id="edit-panel">
  <div class="ep-head"><h2>✏️ 依頼ページを編集</h2><button class="ep-xbtn" id="ep-xbtn">✕</button></div>
  <div class="ep-body">
    <div id="ep-loading" style="text-align:center;padding:40px;color:#999;font-size:13px">読み込み中...</div>
    <form id="ep-form" style="display:none">
      <div class="ep-sec">基本情報</div>
      <div class="ep-f"><label>ページタイトル <span class="r">*</span></label><input type="text" name="ページタイトル" required></div>
      <div class="ep-2">
        <div class="ep-f"><label>月度ラベル</label><input type="text" name="月度ラベル"></div>
        <div class="ep-f"><label>ブランド名 <span class="r">*</span></label><input type="text" name="ブランド名" required></div>
      </div>
      <div class="ep-f"><label>商品公式サイトURL <span class="r">*</span></label><input type="url" name="商品公式サイトURL" required></div>
      <div class="ep-sec">案件概要</div>
      <div class="ep-f"><label>お願いしたいこと（説明） <span class="r">*</span></label><textarea name="お願いしたいこと（説明）" class="t" required></textarea></div>
      <div class="ep-f"><label>投稿期間（テキスト） <span class="r">*</span></label><textarea name="投稿期間（テキスト）" required></textarea></div>
      <div class="ep-2">
        <div class="ep-f"><label>応募締切 <span class="r">*</span></label><input type="text" name="応募締切" required></div>
        <div class="ep-f"><label>報酬（商品名・金額） <span class="r">*</span></label><input type="text" name="報酬（商品名・金額）" required></div>
      </div>
      <div class="ep-f"><label>投稿媒体 <span class="r">*</span></label><textarea name="投稿媒体" required></textarea></div>
      <div class="ep-f"><label>投稿内容 <span class="r">*</span></label><textarea name="投稿内容" required></textarea></div>
      <div class="ep-sec">商品情報</div>
      <div class="ep-f"><label>商品説明テキスト <span class="r">*</span></label><textarea name="商品説明テキスト" class="t" required></textarea></div>
      <div class="ep-f"><label>こんな人にオススメ（改行区切り）</label><textarea name="こんな人にオススメ（改行区切り）"></textarea></div>
      <div class="ep-f"><label>商品名（表記） <span class="r">*</span></label><textarea name="商品名（表記）" required></textarea></div>
      <div class="ep-2">
        <div class="ep-f"><label>容量・内容量</label><input type="text" name="容量・内容量"></div>
        <div class="ep-f"><label>販売価格</label><input type="text" name="販売価格"></div>
      </div>
      <div class="ep-f"><label>販売先</label><textarea name="販売先"></textarea></div>
      <div class="ep-sec">FAQ（最大5件）</div>
      <div class="ep-faq"><div class="ep-faq-n">FAQ 1</div><div class="ep-f"><input type="text" name="FAQ質問1" placeholder="Q"></div><div class="ep-f" style="margin-bottom:0"><textarea name="FAQ回答1" placeholder="A"></textarea></div></div>
      <div class="ep-faq"><div class="ep-faq-n">FAQ 2</div><div class="ep-f"><input type="text" name="FAQ質問2" placeholder="Q"></div><div class="ep-f" style="margin-bottom:0"><textarea name="FAQ回答2" placeholder="A"></textarea></div></div>
      <div class="ep-faq"><div class="ep-faq-n">FAQ 3</div><div class="ep-f"><input type="text" name="FAQ質問3" placeholder="Q"></div><div class="ep-f" style="margin-bottom:0"><textarea name="FAQ回答3" placeholder="A"></textarea></div></div>
      <div class="ep-faq"><div class="ep-faq-n">FAQ 4</div><div class="ep-f"><input type="text" name="FAQ質問4" placeholder="Q"></div><div class="ep-f" style="margin-bottom:0"><textarea name="FAQ回答4" placeholder="A"></textarea></div></div>
      <div class="ep-faq"><div class="ep-faq-n">FAQ 5</div><div class="ep-f"><input type="text" name="FAQ質問5" placeholder="Q"></div><div class="ep-f" style="margin-bottom:0"><textarea name="FAQ回答5" placeholder="A"></textarea></div></div>
      <div class="ep-sec">NG事項 &amp; 必須表現</div>
      <div class="ep-f"><label>NG事項（改行区切り） <span class="r">*</span></label><textarea name="NG事項（改行区切り）" class="t" required></textarea></div>
      <div class="ep-f"><label>必須キャプション <span class="r">*</span></label><textarea name="必須キャプション" required></textarea></div>
      <div class="ep-f"><label>必須ハッシュタグ（スペース区切り） <span class="r">*</span></label><input type="text" name="必須ハッシュタグ（スペース区切り）" required></div>
      <div class="ep-2">
        <div class="ep-f"><label>Instagramアカウントタグ</label><input type="text" name="Instagramアカウントタグ"></div>
        <div class="ep-f"><label>TikTokアカウントタグ</label><input type="text" name="TikTokアカウントタグ"></div>
      </div>
      <div class="ep-2">
        <div class="ep-f"><label>Xアカウントタグ</label><input type="text" name="Xアカウントタグ"></div>
        <div class="ep-f"><label>X投稿用リンク（任意）</label><input type="text" name="X投稿用リンク（任意）"></div>
      </div>
      <div class="ep-sec">参考例・フロー</div>
      <div class="ep-f"><label>過去の投稿例（改行区切り）</label><textarea name="過去の投稿例（改行区切り）" class="t"></textarea></div>
      <div class="ep-f"><label>お問い合わせ先（改行区切り） <span class="r">*</span></label><textarea name="お問い合わせ先（改行区切り）" required></textarea></div>
      <button type="submit" class="ep-save" id="ep-save">保存する</button>
      <div class="ep-status" id="ep-status"></div>
    </form>
  </div>
</div>
<div class="footer"><strong>GOOD VIBES AGENCY</strong><br>本ページのURLは依頼タレント様のみへの共有としてください</div>
<script>
function copyText(blockId,btn){
  const block=document.getElementById(blockId);
  const text=block.innerText.replace('コピー','').trim();
  navigator.clipboard.writeText(text).then(()=>{
    btn.textContent='✓ コピー完了';btn.classList.add('copied');
    setTimeout(()=>{btn.textContent='コピー';btn.classList.remove('copied');},2000);
  });
}
</script>
</body>
</html>\`;

// ── データJSON生成 ──────────────────────────────
function buildDataJson_(r, slug, gasEndpoint) {
  const KEYS = [
    'ページタイトル','月度ラベル','ブランド名','商品公式サイトURL',
    'お願いしたいこと（説明）','投稿期間（テキスト）','応募締切','投稿媒体','投稿内容','報酬（商品名・金額）',
    '商品説明テキスト','こんな人にオススメ（改行区切り）','商品名（表記）','容量・内容量','販売価格','販売先',
    'FAQ質問1','FAQ回答1','FAQ質問2','FAQ回答2','FAQ質問3','FAQ回答3',
    'FAQ質問4','FAQ回答4','FAQ質問5','FAQ回答5',
    'NG事項（改行区切り）','必須キャプション','必須ハッシュタグ（スペース区切り）',
    'Instagramアカウントタグ','TikTokアカウントタグ','Xアカウントタグ','X投稿用リンク（任意）',
    '過去の投稿例（改行区切り）','お問い合わせ先（改行区切り）'
  ];
  const fields = {};
  KEYS.forEach(k => { fields[k] = r[k] || ''; });
  return JSON.stringify({ slug, gasEndpoint, createdAt: new Date().toISOString(), fields }, null, 2);
}
