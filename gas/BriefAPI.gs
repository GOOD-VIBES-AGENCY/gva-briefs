// =============================================
// GVA Brief API — ウェブアプリエンドポイント（v2）
// =============================================
// Code.gs と同じプロジェクトに追加してデプロイ
// Script Properties: GITHUB_TOKEN, DELIVERY_GAS_ENDPOINT

const BRIEF_PAGES_BASE = 'https://goodvibesagency.tokyo/gva-briefs';

function doPost(e) {
  try {
    const r = e.parameter;
    if ((r['action'] || 'create') === 'update') return handleUpdate(r);
    return handleCreate(r);
  } catch(err) {
    Logger.log('Error: ' + err.message);
    return ContentService.createTextOutput(JSON.stringify({ success:false, error:err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status:'GVA Brief API running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 新規作成 ──────────────────────────────────────────
function handleCreate(r) {
  const deliveryEp = PropertiesService.getScriptProperties().getProperty('DELIVERY_GAS_ENDPOINT') || '';
  const gasEp      = ScriptApp.getService().getUrl();
  const slug       = r['slug'] || ('brief-' + Date.now());
  const pageUrl    = BRIEF_PAGES_BASE + '/briefs/' + slug + '/';
  const delivUrl   = pageUrl + 'delivery.html';

  r['配送フォームURL'] = delivUrl;
  const briefHtml  = buildHtml(r);
  const delivHtml  = buildDeliveryHtml_(r, deliveryEp);
  const dataStr    = buildDataJson_(r, slug, gasEp);

  pushToGitHub('briefs/' + slug + '/index.html',    briefHtml, '✨ Add brief: '    + (r['ページタイトル'] || ''));
  pushToGitHub('briefs/' + slug + '/delivery.html', delivHtml, '📦 Add delivery: ' + (r['ページタイトル'] || ''));
  pushToGitHub('briefs/' + slug + '/data.json',     dataStr,   '💾 Add data: '     + (r['ページタイトル'] || ''));
  updateIndex(r, slug, pageUrl);

  return ContentService.createTextOutput(JSON.stringify({ success:true, pageUrl, deliveryUrl:delivUrl }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 更新 ──────────────────────────────────────────────
function handleUpdate(r) {
  const slug = r['slug'];
  if (!slug) throw new Error('slug が指定されていません');

  let gasEp = ScriptApp.getService().getUrl();
  try {
    const res = UrlFetchApp.fetch(
      'https://api.github.com/repos/' + getConfig().GITHUB_OWNER + '/' + getConfig().GITHUB_REPO +
      '/contents/briefs/' + slug + '/data.json',
      { headers: { Authorization: '***' + getConfig().GITHUB_TOKEN }, muteHttpExceptions: true }
    );
    if (res.getResponseCode() === 200) {
      const d = JSON.parse(Utilities.newBlob(Utilities.base64Decode(JSON.parse(res.getContentText()).content)).getDataAsString());
      gasEp = d.gasEndpoint || gasEp;
    }
  } catch(e) {}

  r['配送フォームURL'] = BRIEF_PAGES_BASE + '/briefs/' + slug + '/delivery.html';
  const briefHtml = buildHtml(r);
  const dataStr   = buildDataJson_(r, slug, gasEp);

  pushToGitHub('briefs/' + slug + '/index.html', briefHtml, '✏️ Update brief: ' + (r['ページタイトル'] || ''));
  pushToGitHub('briefs/' + slug + '/data.json',  dataStr,   '✏️ Update data: '  + (r['ページタイトル'] || ''));
  patchIndexCard_(r, slug);

  return ContentService.createTextOutput(JSON.stringify({ success:true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── index.html のカードのタイトル・ブランドを書き換え ────
function patchIndexCard_(r, slug) {
  const cfg = getConfig();
  const url = 'https://api.github.com/repos/' + cfg.GITHUB_OWNER + '/' + cfg.GITHUB_REPO + '/contents/index.html';
  let html = '', sha = '';
  try {
    const res = UrlFetchApp.fetch(url, { headers:{ Authorization:'***'+cfg.GITHUB_TOKEN }, muteHttpExceptions:true });
    if (res.getResponseCode() !== 200) return;
    const d = JSON.parse(res.getContentText());
    sha  = d.sha;
    html = Utilities.newBlob(Utilities.base64Decode(d.content)).getDataAsString();
  } catch(e) { return; }

  const marker = 'data-slug="' + slug + '"';
  const idx = html.indexOf(marker);
  if (idx < 0) return;

  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  // brief-meta を更新
  const metaStart = html.indexOf('class="brief-meta">', idx) + 'class="brief-meta">'.length;
  const metaEnd   = html.indexOf('</div>', metaStart);
  // brief-title を更新
  const titleStart = html.indexOf('class="brief-title">', metaEnd) + 'class="brief-title">'.length;
  const titleEnd   = html.indexOf('</div>', titleStart);

  const newHtml = html.slice(0, metaStart) + esc(now) + ' ／ ' + esc(r['ブランド名'] || '') +
                  html.slice(metaEnd, titleStart) + esc(r['ページタイトル'] || '') +
                  html.slice(titleEnd);

  if (newHtml === html) return;
  pushToGitHub('index.html', newHtml, '📋 Update card: ' + (r['ページタイトル'] || ''));
}

// ── 配送フォーム HTML 生成 ─────────────────────────────
function buildDeliveryHtml_(r, gasEndpoint) {
  const campaign = esc(r['ページタイトル'] || '');
  const ep = gasEndpoint || 'YOUR_DELIVERY_GAS_ENDPOINT';

  return '<!DOCTYPE html>\n' +
'<html lang="ja">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>配送先ご入力フォーム | GOOD VIBES AGENCY</title>\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">\n' +
'  <style>\n' +
'    :root{--bg:#F5F5F5;--white:#FFFFFF;--accent:#1A1A1A;--border:#E0E0E0;--section-bg:#FAFAFA;--text:#1A1A1A;--mid:#555555;--light:#999999;}\n' +
'    *{margin:0;padding:0;box-sizing:border-box;}\n' +
'    body{background:var(--bg);font-family:"Noto Sans JP",sans-serif;font-size:14px;line-height:1.8;color:var(--text);}\n' +
'    .header{background:var(--accent);}\n' +
'    .header-inner{max-width:560px;margin:0 auto;padding:36px 24px 30px;}\n' +
'    .gva-badge{display:inline-flex;align-items:center;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:3px 10px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:14px;}\n' +
'    .header h1{font-size:18px;font-weight:700;color:#fff;margin-bottom:6px;}\n' +
'    .header p{color:rgba(255,255,255,0.45);font-size:12px;line-height:1.7;}\n' +
'    .container{max-width:560px;margin:0 auto;padding:28px 16px 80px;}\n' +
'    .notice-card{background:var(--white);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:24px;font-size:13px;color:var(--mid);line-height:1.8;}\n' +
'    .notice-card strong{color:var(--text);}\n' +
'    .section-label{font-size:11px;font-weight:700;color:var(--light);letter-spacing:0.1em;text-transform:uppercase;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid var(--border);}\n' +
'    .field{margin-bottom:14px;}\n' +
'    .field label{display:block;font-size:12px;font-weight:700;color:var(--mid);margin-bottom:5px;}\n' +
'    .field label .req{color:#E53935;margin-left:3px;}\n' +
'    .field label .opt{color:var(--light);font-weight:400;margin-left:4px;font-size:11px;}\n' +
'    .field input,.field textarea,.field select{width:100%;border:1px solid var(--border);border-radius:6px;padding:11px 13px;font-size:14px;font-family:"Noto Sans JP",sans-serif;background:var(--white);color:var(--text);transition:border-color 0.15s;-webkit-appearance:none;appearance:none;}\n' +
'    .field input:focus,.field textarea:focus,.field select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px rgba(26,26,26,0.08);}\n' +
'    .field textarea{min-height:80px;resize:vertical;}\n' +
'    .field .hint{font-size:11px;color:var(--light);margin-top:4px;}\n' +
'    .zip-row{display:grid;grid-template-columns:160px 1fr;gap:10px;align-items:end;}\n' +
'    .zip-btn{height:44px;background:var(--section-bg);border:1px solid var(--border);border-radius:6px;font-size:12px;font-weight:700;color:var(--mid);cursor:pointer;font-family:inherit;white-space:nowrap;padding:0 14px;}\n' +
'    .zip-btn:hover{background:var(--border);}\n' +
'    .radio-group{display:flex;flex-direction:column;gap:8px;}\n' +
'    .radio-item{display:flex;align-items:flex-start;gap:10px;background:var(--white);border:1px solid var(--border);border-radius:8px;padding:12px 14px;cursor:pointer;transition:border-color 0.15s;}\n' +
'    .radio-item:has(input:checked){border-color:var(--accent);background:var(--section-bg);}\n' +
'    .radio-item input[type="radio"]{width:16px;height:16px;margin-top:3px;flex-shrink:0;accent-color:var(--accent);}\n' +
'    .radio-label{font-size:13px;font-weight:700;color:var(--text);}\n' +
'    .radio-desc{font-size:11px;color:var(--light);margin-top:1px;}\n' +
'    .submit-btn{width:100%;background:var(--accent);color:white;border:none;border-radius:8px;padding:16px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity 0.15s;margin-top:32px;}\n' +
'    .submit-btn:hover{opacity:0.85;}\n' +
'    .submit-btn:disabled{opacity:0.4;cursor:not-allowed;}\n' +
'    .spinner{display:none;width:20px;height:20px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;}\n' +
'    @keyframes spin{to{transform:rotate(360deg);}}\n' +
'    .result-card{display:none;background:#F1F8F1;border:1px solid #A5D6A7;border-radius:8px;padding:28px;text-align:center;margin-top:24px;}\n' +
'    .result-card h3{font-size:18px;color:#2E7D32;margin-bottom:10px;}\n' +
'    .result-card p{font-size:13px;color:var(--mid);line-height:1.8;}\n' +
'    .error-msg{display:none;background:#FFF3F3;border:1px solid #FFCDD2;border-radius:8px;padding:14px 16px;margin-top:16px;font-size:13px;color:#C62828;}\n' +
'    .footer{text-align:center;padding:24px 16px;color:var(--light);font-size:11px;border-top:1px solid var(--border);margin-top:40px;}\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'<div class="header"><div class="header-inner">\n' +
'  <div class="gva-badge">GOOD VIBES AGENCY</div>\n' +
'  <h1>📦 配送先ご入力フォーム</h1>\n' +
'  <p>ご参加いただける場合、下記フォームに配送先をご入力ください。<br>入力後、2〜5営業日以内に発送いたします。</p>\n' +
'</div></div>\n' +
'<div class="container">\n' +
'  <div class="notice-card">🎁 <strong>ご協力いただいた案件：</strong>' + campaign + '<br>ご不明な点はGVAアカウントのDMまでご連絡ください。</div>\n' +
'  <form id="df">\n' +
'    <input type="hidden" name="campaign" value="' + campaign + '">\n' +
'    <div class="section-label">基本情報</div>\n' +
'    <div class="field"><label>Instagram ID <span class="req">*</span></label><input type="text" name="instagram_id" placeholder="@username" required></div>\n' +
'    <div class="field"><label>お名前（本名） <span class="req">*</span></label><input type="text" name="full_name" placeholder="山田 花子" required><div class="hint">配送伝票に記載されます。フルネームでご入力ください。</div></div>\n' +
'    <div class="field"><label>電話番号 <span class="req">*</span></label><input type="tel" name="phone" placeholder="090-0000-0000" required></div>\n' +
'    <div class="section-label">配送先住所</div>\n' +
'    <div class="field"><label>郵便番号 <span class="req">*</span></label><div class="zip-row"><input type="text" name="zip" id="zip" placeholder="000-0000" maxlength="8" required><button type="button" class="zip-btn" onclick="lz()">住所を自動入力</button></div></div>\n' +
'    <div class="field"><label>都道府県 <span class="req">*</span></label><select name="prefecture" id="pref" required><option value="">選択してください</option><option>北海道</option><option>青森県</option><option>岩手県</option><option>宮城県</option><option>秋田県</option><option>山形県</option><option>福島県</option><option>茨城県</option><option>栃木県</option><option>群馬県</option><option>埼玉県</option><option>千葉県</option><option>東京都</option><option>神奈川県</option><option>新潟県</option><option>富山県</option><option>石川県</option><option>福井県</option><option>山梨県</option><option>長野県</option><option>岐阜県</option><option>静岡県</option><option>愛知県</option><option>三重県</option><option>滋賀県</option><option>京都府</option><option>大阪府</option><option>兵庫県</option><option>奈良県</option><option>和歌山県</option><option>鳥取県</option><option>島根県</option><option>岡山県</option><option>広島県</option><option>山口県</option><option>徳島県</option><option>香川県</option><option>愛媛県</option><option>高知県</option><option>福岡県</option><option>佐賀県</option><option>長崎県</option><option>熊本県</option><option>大分県</option><option>宮崎県</option><option>鹿児島県</option><option>沖縄県</option></select></div>\n' +
'    <div class="field"><label>市区町村・番地 <span class="req">*</span></label><input type="text" name="address1" id="a1" placeholder="渋谷区渋谷1-2-3" required></div>\n' +
'    <div class="field"><label>建物名・部屋番号 <span class="opt">任意</span></label><input type="text" name="address2" placeholder="○○マンション 101号室"></div>\n' +
'    <div class="section-label">二次利用について</div>\n' +
'    <div class="field">\n' +
'      <label>投稿画像・動画の二次利用可否 <span class="req">*</span></label>\n' +
'      <div class="hint" style="margin-bottom:10px">クライアントによるSNS・広告等での再使用に関するご意向をお聞かせください。</div>\n' +
'      <div class="radio-group">\n' +
'        <label class="radio-item"><input type="radio" name="secondary_use" value="OK（二次利用可）" required><div><div class="radio-label">✅ OK（二次利用可）</div><div class="radio-desc">クライアントのSNSや広告素材として使用することを許可します</div></div></label>\n' +
'        <label class="radio-item"><input type="radio" name="secondary_use" value="NG（二次利用不可）"><div><div class="radio-label">🚫 NG（二次利用不可）</div><div class="radio-desc">投稿はご自身のアカウントのみでの使用とします</div></div></label>\n' +
'        <label class="radio-item"><input type="radio" name="secondary_use" value="要相談"><div><div class="radio-label">💬 要相談</div><div class="radio-desc">使用目的・条件によって判断したいです</div></div></label>\n' +
'      </div>\n' +
'    </div>\n' +
'    <div class="section-label">備考</div>\n' +
'    <div class="field"><label>備考・連絡事項 <span class="opt">任意</span></label><textarea name="notes" placeholder="不在が多い時間帯など、ご連絡事項があればご記入ください。"></textarea></div>\n' +
'    <button type="submit" class="submit-btn" id="sb"><span id="st">送信する</span><span class="spinner" id="sp"></span></button>\n' +
'  </form>\n' +
'  <div class="error-msg" id="em">送信中にエラーが発生しました。時間をおいて再度お試しください。</div>\n' +
'  <div class="result-card" id="rc"><h3>✅ 送信完了しました！</h3><p>配送先情報を受け付けました。<br>2〜5営業日以内に発送いたします。<br><br>引き続きよろしくお願いいたします🙇‍♀️</p></div>\n' +
'</div>\n' +
'<div class="footer">GOOD VIBES AGENCY — 本フォームは依頼タレント様専用です</div>\n' +
'<script>\n' +
'const EP="' + ep.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '";\n' +
'document.getElementById("zip").addEventListener("input",function(){let v=this.value.replace(/[^0-9]/g,"");if(v.length>3)v=v.slice(0,3)+"-"+v.slice(3,7);this.value=v;});\n' +
'async function lz(){const z=document.getElementById("zip").value.replace(/[^0-9]/g,"");if(z.length!==7){alert("郵便番号を7桁で入力してください");return;}try{const r=await fetch("https://zipcloud.ibsnet.co.jp/api/search?zipcode="+z);const d=await r.json();if(d.results){const x=d.results[0];const p=document.getElementById("pref");for(let i=0;i<p.options.length;i++){if(p.options[i].text===x.address1){p.selectedIndex=i;break;}}document.getElementById("a1").value=x.address2+x.address3;}else{alert("住所が見つかりませんでした。");}}catch(e){alert("住所の取得に失敗しました。");}}\n' +
'document.getElementById("df").addEventListener("submit",async function(e){e.preventDefault();const sb=document.getElementById("sb");const st=document.getElementById("st");const sp=document.getElementById("sp");sb.disabled=true;st.style.display="none";sp.style.display="block";document.getElementById("em").style.display="none";try{if(EP&&EP!=="YOUR_DELIVERY_GAS_ENDPOINT"){await fetch(EP,{method:"POST",mode:"no-cors",body:new URLSearchParams(new FormData(this))});}else{await new Promise(r=>setTimeout(r,800));}this.style.display="none";document.querySelector(".notice-card").style.display="none";document.getElementById("rc").style.display="block";}catch(err){sb.disabled=false;st.style.display="block";sp.style.display="none";document.getElementById("em").style.display="block";}});\n' +
'<\/script>\n' +
'</body>\n' +
'</html>';
}
