// =============================================
// GVA タイアップ依頼ページ 完全自動セットアップ
// =============================================
//
// 【使い方 — 3ステップだけ】
//
//  1. https://script.google.com で新規プロジェクトを作成
//  2. このファイル（Setup.gs）と Code.gs を貼り付けて保存
//  3. スクリプトプロパティに GITHUB_TOKEN を追加
//     → プロジェクトの設定 > スクリプトプロパティ
//        キー: GITHUB_TOKEN  値: (GitHubトークン)
//  4. 関数「runSetup」を選択して実行 → 完了！
//
// =============================================

function runSetup() {
  const ui = getUiSafe();

  try {
    log('🚀 GVA セットアップ開始...');

    // ── 1. GitHubトークンを確認 ──────────────────
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
    if (!token) {
      const msg = '⚠️ GITHUB_TOKEN が設定されていません。\n\nプロジェクトの設定 > スクリプトプロパティ から追加してください。';
      log(msg);
      if (ui) ui.alert(msg);
      return;
    }
    log('✅ GitHubトークン確認OK');

    // ── 2. フォーム作成 ───────────────────────────
    log('📋 Googleフォームを作成中...');
    const form = buildForm();
    log('✅ フォーム作成完了: ' + form.getPublishedUrl());

    // ── 3. スプレッドシートにリンク ─────────────────
    log('📊 スプレッドシートを作成中...');
    const ss = SpreadsheetApp.create('【GVA】タイアップ依頼 回答シート');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    log('✅ スプレッドシート作成完了: ' + ss.getUrl());

    // ── 4. トリガーを設定 ─────────────────────────
    log('⚡ トリガーを設定中...');

    // 既存トリガーを削除（再実行時の重複を防ぐ）
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(t);
      }
    });

    ScriptApp.newTrigger('onFormSubmit')
      .forSpreadsheet(ss)
      .onFormSubmit()
      .create();
    log('✅ トリガー設定完了（onFormSubmit → フォーム送信時）');

    // ── 5. 完了サマリー ───────────────────────────
    const formUrl  = form.getPublishedUrl();
    const editUrl  = form.getEditUrl();
    const ssUrl    = ss.getUrl();
    const pagesUrl = 'http://goodvibesagency.tokyo/gva-briefs/';

    const summary = [
      '==========================================',
      '🎉 セットアップ完了！',
      '',
      '📋 フォーム（タレント向け送付用）:',
      formUrl,
      '',
      '✏️  フォーム（編集用）:',
      editUrl,
      '',
      '📊 回答スプレッドシート:',
      ssUrl,
      '',
      '🌐 依頼ページ一覧:',
      pagesUrl,
      '',
      '【これで完了です！】',
      'フォームを送信するたびに自動でページが生成されます。',
      '==========================================',
    ].join('\n');

    log(summary);

    if (ui) {
      ui.alert(
        '🎉 セットアップ完了！',
        '📋 フォームURL:\n' + formUrl +
        '\n\n📊 スプレッドシート:\n' + ssUrl +
        '\n\n🌐 依頼ページ一覧:\n' + pagesUrl +
        '\n\nフォームを送信するたびに自動でページが生成されます！',
        ui.ButtonSet.OK
      );
    }

  } catch(err) {
    const msg = '❌ セットアップエラー: ' + err.message;
    log(msg);
    if (ui) ui.alert(msg);
    throw err;
  }
}

// ── フォーム構築 ──────────────────────────────
function buildForm() {
  const form = FormApp.create('【GVA】タイアップ依頼ページ 作成フォーム');
  form.setDescription('このフォームを送信すると、タイアップ依頼ページが自動生成されGitHub Pagesに公開されます。');
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('✅ 送信完了！しばらくするとページが生成されます。');

  // ─ 基本情報 ──────────────────────────────────
  form.addSectionHeaderItem()
    .setTitle('📋  基本情報');

  addText(form, 'ページタイトル',
    '例: フィービー【アイラッシュセラム】タイアップのご依頼 👑（６月度）', true);

  addText(form, '月度ラベル',
    '例: 2026年6月度', false);

  addText(form, 'ブランド名',
    'URLスラグに使用。英数字推奨。例: phoebe / canmake / shiseido', true);

  addText(form, '商品公式サイトURL',
    'https:// から始まるURL', true);

  // ─ 案件概要 ──────────────────────────────────
  form.addSectionHeaderItem()
    .setTitle('📅  案件概要');

  addPara(form, 'お願いしたいこと（説明）',
    '例:\n商品をお試しいただき、Instagramへの投稿をお願いします🙇‍♀️\n複数媒体での投稿も大歓迎です✨', true);

  addPara(form, '投稿期間（テキスト）',
    '例:\nInstagram：6月1日（月）〜6月30日（火）\nX：6月3日（水）〜6月10日（水）', true);

  addText(form, '応募締切',
    '例: 6月25日（木）17時まで', true);

  addPara(form, '投稿媒体',
    '例:\nInstagram：フィード・リール\nX：1ポスト', true);

  addPara(form, '投稿内容',
    '例: 商品の使用感・日常ケアシーン', true);

  addText(form, '報酬（商品名・金額）',
    '例: ○○ 無償提供（¥5,800相当）', true);

  // ─ 商品情報 ──────────────────────────────────
  form.addSectionHeaderItem()
    .setTitle('👀  商品情報');

  addPara(form, '商品説明テキスト',
    '商品の特徴・効果・成分などの説明文', true);

  addPara(form, 'こんな人にオススメ（改行区切り）',
    '1行に1項目:\n長くて太いまつ毛が欲しい\nダメージが気にならない自まつ毛が欲しい', false);

  addPara(form, '商品名（表記）',
    '例: フィービー ビューティーアップ アイラッシュセラムN2\n→「フィービーのまつげ美容液」でもOK', true);

  addText(form, '容量・内容量', '例: 5mL（約2ヶ月分）', false);
  addText(form, '販売価格',    '例: 5,830円（税込）', false);
  addPara(form, '販売先', '例: 公式サイト・楽天・Amazon・Yahoo!・Qoo10', false);

  // ─ FAQ ───────────────────────────────────────
  form.addSectionHeaderItem()
    .setTitle('❓  よくある質問（最大5件）')
    .setHelpText('空欄はスキップされます');

  for (let i = 1; i <= 5; i++) {
    addText(form, 'FAQ質問' + i, '例: どれくらい持ちますか？', false);
    addPara(form, 'FAQ回答' + i, '例: 朝晩2回のご使用で約2か月分です。', false);
  }

  // ─ NG事項・必須表現 ──────────────────────────
  form.addSectionHeaderItem()
    .setTitle('🚫  NG事項 & 必須表現');

  addPara(form, 'NG事項（改行区切り）',
    '1行に1項目:\n比較表現（他社製品との比較など）\n完璧表現（絶対・完全・完璧など）\n効果発現・持続時間の保証となる表現', true);

  addPara(form, '必須キャプション',
    '例: フィービーからいただきました', true);

  addText(form, '必須ハッシュタグ（スペース区切り）',
    '例: #フィービー #まつ毛美容液 #gifted', true);

  addText(form, 'Instagramアカウントタグ', '例: @phoebe_beautyup', false);
  addText(form, 'TikTokアカウントタグ',    '例: @onkata_phoebe', false);
  addText(form, 'Xアカウントタグ',         '例: @phoebebeautyup', false);

  addText(form, 'X投稿用リンク（任意）',
    '例: https://item.rakuten.co.jp/...', false);

  // ─ 参考例・フロー ─────────────────────────────
  form.addSectionHeaderItem()
    .setTitle('✨  参考例・フロー');

  addPara(form, '過去の投稿例（改行区切り）',
    '形式: プラットフォーム|説明|URL\n例:\nInstagram|セルフィーと商品を自然に紹介|https://www.instagram.com/p/XXX/\nX|使用感をテキスト＋写真で紹介|https://x.com/XXX/status/123/', false);

  addText(form, '配送フォームURL',
    'タレントが配送先を入力するフォームのURL', true);

  addPara(form, 'お問い合わせ先（改行区切り）',
    '形式: プラットフォーム|URL\n例:\nInstagram|https://www.instagram.com/gva_casting/\nX|https://x.com/biyouotaku_dayo', true);

  return form;
}

// ── ヘルパー ────────────────────────────────
function addText(form, title, help, required) {
  const item = form.addTextItem().setTitle(title).setRequired(required);
  if (help) item.setHelpText(help);
  return item;
}

function addPara(form, title, help, required) {
  const item = form.addParagraphTextItem().setTitle(title).setRequired(required);
  if (help) item.setHelpText(help);
  return item;
}

function log(msg) {
  Logger.log(msg);
  console.log(msg);
}

function getUiSafe() {
  try { return SpreadsheetApp.getUi(); } catch(e) {}
  try { return FormApp.getUi(); }       catch(e) {}
  return null;
}
