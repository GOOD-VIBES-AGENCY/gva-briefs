// =============================================
// GVA 配送先フォーム — GAS Web API
// =============================================
//
// 【セットアップ手順】
//  1. https://script.google.com で新規プロジェクト作成
//  2. このコードを貼り付けて保存
//  3. 「デプロイ」>「新しいデプロイ」
//       種類: ウェブアプリ
//       実行ユーザー: 自分
//       アクセス: 全員（匿名ユーザーを含む）
//  4. 表示されたURLを delivery-sample.html の GAS_ENDPOINT に貼り付ける
// =============================================

// スプレッドシートID（初回実行時に自動生成・保存される）
function getSheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('DELIVERY_SS_ID');
  let ss;

  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch(e) { ssId = null; }
  }
  if (!ssId) {
    ss = SpreadsheetApp.create('【GVA】配送先フォーム 回答シート');
    props.setProperty('DELIVERY_SS_ID', ss.getId());
    Logger.log('スプレッドシート作成: ' + ss.getUrl());
  }

  const SHEET_NAME = '配送先一覧';
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // ヘッダー行
    const headers = [
      'タイムスタンプ',
      '案件名',
      'Instagram ID',
      'お名前（本名）',
      '電話番号',
      '郵便番号',
      '都道府県',
      '市区町村・番地',
      '建物名・部屋番号',
      '二次利用',
      '備考'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#F5F5F5');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(8, 240);
  }
  return sheet;
}

// POSTリクエストを受け取って記録
function doPost(e) {
  try {
    const d = e.parameter;
    const sheet = getSheet();

    sheet.appendRow([
      new Date(),
      d.campaign    || '',
      d.instagram_id|| '',
      d.full_name   || '',
      d.phone       || '',
      d.zip         || '',
      d.prefecture  || '',
      d.address1    || '',
      d.address2    || '',
      d.secondary_use || '',
      d.notes       || ''
    ]);

    // 通知メール（任意）
    const notifyEmail = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
    if (notifyEmail) {
      const subject = '【GVA】配送先入力: ' + (d.full_name || '不明') + ' / ' + (d.campaign || '');
      const body = [
        '配送先が入力されました。',
        '',
        '案件名: '       + (d.campaign || ''),
        'Instagram ID: ' + (d.instagram_id || ''),
        'お名前: '       + (d.full_name || ''),
        '電話番号: '     + (d.phone || ''),
        '住所: 〒'       + (d.zip || '') + ' ' + (d.prefecture || '') + (d.address1 || '') + ' ' + (d.address2 || ''),
        '二次利用: '     + (d.secondary_use || ''),
        '備考: '         + (d.notes || ''),
        '',
        'スプレッドシートで確認: ' + SpreadsheetApp.openById(
          PropertiesService.getScriptProperties().getProperty('DELIVERY_SS_ID')
        ).getUrl()
      ].join('\n');
      GmailApp.sendEmail(notifyEmail, subject, body);
    }

    return ContentService
      .createTextOutput('OK')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch(err) {
    Logger.log('Error: ' + err.message);
    return ContentService
      .createTextOutput('ERROR: ' + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// 動作確認用（GETリクエスト）
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'GVA Delivery Form API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
