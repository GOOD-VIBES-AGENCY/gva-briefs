// =============================================
// GVA タイアップ依頼フォーム 自動作成スクリプト
// =============================================
// 使い方:
// 1. Google Apps Script (script.google.com) で新規プロジェクトを作成
// 2. このコードを貼り付けて保存
// 3. 「createBriefForm」を選択して実行
// 4. 実行ログにフォームURLとスプレッドシートURLが表示される
// =============================================

function createBriefForm() {
  // フォーム作成
  const form = FormApp.create('【GVA】タイアップ依頼ページ 作成フォーム');
  form.setDescription('このフォームを送信すると、タイアップ依頼ページが自動生成されGitHub Pagesに公開されます。');
  form.setCollectEmail(false);
  form.setProgressBar(true);

  // ─ セクション1: 基本情報 ─────────────────────
  form.addSectionHeaderItem()
    .setTitle('📋 基本情報')
    .setHelpText('ページのタイトルとブランド情報を入力してください');

  form.addTextItem()
    .setTitle('ページタイトル')
    .setHelpText('例: フィービー【アイラッシュセラム】タイアップのご依頼 👑（６月度）')
    .setRequired(true);

  form.addTextItem()
    .setTitle('月度ラベル')
    .setHelpText('例: 2026年6月度')
    .setRequired(false);

  form.addTextItem()
    .setTitle('ブランド名')
    .setHelpText('URLに使用します。英数字推奨。例: phoebe / shiseido / canmake')
    .setRequired(true);

  form.addTextItem()
    .setTitle('商品公式サイトURL')
    .setHelpText('https:// から始まるURL')
    .setRequired(true);

  // ─ セクション2: 案件概要 ─────────────────────
  form.addSectionHeaderItem()
    .setTitle('📅 案件概要')
    .setHelpText('投稿期間・締切・報酬を設定してください');

  form.addParagraphTextItem()
    .setTitle('お願いしたいこと（説明）')
    .setHelpText('例: 商品をお試しいただき、Instagram（フィード・リール）またはXへの投稿をお願いいたします🙇‍♀️\n複数媒体での投稿も大歓迎です✨')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('投稿期間（テキスト）')
    .setHelpText('例:\nInstagram投稿期間：6月1日（月）〜6月30日（火）\nX投稿期間：6月3日（水）〜6月10日（水）※期間指定⚠️')
    .setRequired(true);

  form.addTextItem()
    .setTitle('応募締切')
    .setHelpText('例: 6月25日（木）17時まで')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('投稿媒体')
    .setHelpText('例:\nInstagram：フィード・リール\nX：1ポスト')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('投稿内容')
    .setHelpText('例: 商品の使用感・日常ケアシーン／キャプションまたは画像内に指定のワードを記載')
    .setRequired(true);

  form.addTextItem()
    .setTitle('報酬（商品名・金額）')
    .setHelpText('例: フィービー ビューティーアップ アイラッシュセラム無償提供（¥5,800相当）')
    .setRequired(true);

  // ─ セクション3: 商品情報 ─────────────────────
  form.addSectionHeaderItem()
    .setTitle('👀 商品情報')
    .setHelpText('商品の詳細情報を入力してください');

  form.addParagraphTextItem()
    .setTitle('商品説明テキスト')
    .setHelpText('商品の特徴・効果・成分などの説明文')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('こんな人にオススメ（改行区切り）')
    .setHelpText('1行に1つ入力してください\n例:\n長くて太い、ボリューム感のあるまつ毛が欲しい\nダメージが気にならない自まつ毛が欲しい')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('商品名（表記）')
    .setHelpText('正式名称と略称などがあれば記載\n例: フィービー ビューティーアップ アイラッシュセラムN2\n→「フィービーのまつげ美容液」でもOK')
    .setRequired(true);

  form.addTextItem()
    .setTitle('容量・内容量')
    .setHelpText('例: 5mL〔約2ヶ月分〕')
    .setRequired(false);

  form.addTextItem()
    .setTitle('販売価格')
    .setHelpText('例: 5,830円（税込）')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('販売先')
    .setHelpText('例: PHOEBE BEAUTY UP 公式ブランドサイト／楽天市場・Amazon・Yahoo!ショッピング・Qoo10')
    .setRequired(false);

  // ─ セクション4: FAQ ──────────────────────────
  form.addSectionHeaderItem()
    .setTitle('❓ よくある質問（FAQ）')
    .setHelpText('Q&Aを最大5件まで入力できます（空欄はスキップされます）');

  for (let i = 1; i <= 5; i++) {
    form.addTextItem()
      .setTitle('FAQ質問' + i)
      .setHelpText('例: どれくらい持ちますか？')
      .setRequired(false);
    form.addParagraphTextItem()
      .setTitle('FAQ回答' + i)
      .setHelpText('例: 朝晩2回のご使用で約2か月分です。')
      .setRequired(false);
  }

  // ─ セクション5: NG事項・必須表現 ────────────────
  form.addSectionHeaderItem()
    .setTitle('🚫 NG事項 & 必須表現')
    .setHelpText('投稿ガイドラインを設定してください');

  form.addParagraphTextItem()
    .setTitle('NG事項（改行区切り）')
    .setHelpText('1行に1つ入力してください\n例:\n比較表現（他社製品との比較、●●と比べて、など）\n完璧表現（絶対・完全・完璧・永久など）\n「これさえあれば」「安全性は確認済み」などの保証表現')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('必須キャプション')
    .setHelpText('例: フィービーからいただきました（同じ意味であれば言い換えOK）')
    .setRequired(true);

  form.addTextItem()
    .setTitle('必須ハッシュタグ（スペース区切り）')
    .setHelpText('例: #フィービー #まつ毛美容液 #gifted')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Instagramアカウントタグ')
    .setHelpText('例: @phoebe_beautyup')
    .setRequired(false);

  form.addTextItem()
    .setTitle('TikTokアカウントタグ')
    .setHelpText('例: @onkata_phoebe')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Xアカウントタグ')
    .setHelpText('例: @phoebebeautyup')
    .setRequired(false);

  form.addTextItem()
    .setTitle('X投稿用リンク（任意）')
    .setHelpText('XのみURL設置が必要な場合に入力（ツリー形式で貼るよう案内されます）\n例: https://item.rakuten.co.jp/...')
    .setRequired(false);

  // ─ セクション6: 参考・フロー ─────────────────
  form.addSectionHeaderItem()
    .setTitle('✨ 参考例・フロー')
    .setHelpText('過去の投稿例とフローを設定してください');

  form.addParagraphTextItem()
    .setTitle('過去の投稿例（改行区切り）')
    .setHelpText('形式: プラットフォーム|説明|URL\n例:\nInstagram|セルフィーと商品を自然に紹介した投稿例です|https://www.instagram.com/p/XXX/\nX|商品の使用感をテキスト＋写真で紹介した投稿|https://x.com/XXX/status/123/')
    .setRequired(false);

  form.addTextItem()
    .setTitle('配送フォームURL')
    .setHelpText('タレントが配送先を入力するGoogleフォームなどのURL')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('お問い合わせ先（改行区切り）')
    .setHelpText('形式: プラットフォーム|URL\n例:\nInstagram|https://www.instagram.com/gva_casting/\nX|https://x.com/biyouotaku_dayo')
    .setRequired(true);

  // ─ スプレッドシートにリンク ─────────────────
  const ss = SpreadsheetApp.create('【GVA】タイアップ依頼 回答シート');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  const formUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();
  const ssUrl   = ss.getUrl();

  Logger.log('==========================================');
  Logger.log('✅ フォーム作成完了！');
  Logger.log('');
  Logger.log('📋 フォーム（回答用）:');
  Logger.log(formUrl);
  Logger.log('');
  Logger.log('✏️  フォーム（編集用）:');
  Logger.log(editUrl);
  Logger.log('');
  Logger.log('📊 スプレッドシート:');
  Logger.log(ssUrl);
  Logger.log('');
  Logger.log('【次のステップ】');
  Logger.log('1. スプレッドシートを開く');
  Logger.log('2. 拡張機能 → Apps Script');
  Logger.log('3. Code.gs の内容を貼り付け');
  Logger.log('4. スクリプトプロパティに GITHUB_TOKEN を追加');
  Logger.log('5. トリガー: onFormSubmit → フォーム送信時');
  Logger.log('==========================================');

  // 完了後にUIで通知（スプレッドシートから実行した場合）
  try {
    SpreadsheetApp.getUi().alert(
      '✅ フォーム作成完了！\n\n' +
      'フォームURL:\n' + formUrl + '\n\n' +
      'スプレッドシート:\n' + ssUrl + '\n\n' +
      '実行ログに詳細を出力しました。'
    );
  } catch(e) {
    // UIがない環境ではスキップ
  }

  return { formUrl, editUrl, ssUrl };
}
