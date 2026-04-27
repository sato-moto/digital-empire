---
name: wp-update
description: WordPressの既存投稿をREST API経由で本文・Yoast SEOメタを更新する。記事ファイルを修正した後に呼び出す。
allowed-tools: Bash, Read
---

# wp-update スキル

ローカルの記事HTMLを修正済みの状態で、WordPress上の既存投稿（指定のPOST_ID）を更新する。

## 引数
`$ARGUMENTS` = 更新対象のPOST_ID（例: `256`）

## 処理手順

1. 記事ファイルを特定（`articles/` 内の該当ファイル）
2. META JSONと本文HTMLを解析
3. 本文・タイトル・スラッグをREST APIで更新
4. Yoast SEOメタ（title / metadesc / focuskw）をREST APIで更新

## 実行コマンド

```bash
node -e "
const fs=require('fs'),https=require('https');
const config=JSON.parse(fs.readFileSync('wp-config.json','utf8'));
const auth=Buffer.from(config.username+':'+config.app_password).toString('base64');
const POST_ID=$ARGUMENTS;

// 対象ファイルを引数または手動で指定
const FILE='articles/【ファイル名.html】';
const content=fs.readFileSync(FILE,'utf8');
const meta=JSON.parse(content.match(/<!--\s*META:\s*([\s\S]*?)-->/)[1]);
const htmlBody=content.replace(/<!--\s*META:\s*[\s\S]*?-->/,'').trim().replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i,'');

function req(data){
  return new Promise((resolve,reject)=>{
    const body=Buffer.from(JSON.stringify(data));
    const r=https.request({hostname:'kumatori-info.com',path:'/wp-json/wp/v2/posts/'+POST_ID,method:'POST',
      headers:{'Authorization':'Basic '+auth,'Content-Type':'application/json','Content-Length':body.length}},
      res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>{const p=JSON.parse(b);res.statusCode<300?resolve(p):reject(p)})});
    r.on('error',reject);r.write(body);r.end();
  });
}

(async()=>{
  await req({title:meta.title,content:htmlBody,slug:meta.slug});
  console.log('✅ 本文更新成功');
  await req({meta:{'_yoast_wpseo_title':meta.seo_title,'_yoast_wpseo_metadesc':meta.meta_description,'_yoast_wpseo_focuskw':meta.focus_keyword}});
  console.log('✅ Yoast SEO更新成功');
  console.log('🔗 https://kumatori-info.com/?p='+POST_ID);
})().catch(e=>console.error('❌',e.message||JSON.stringify(e)));
"
```

## 注意
- `setup-yoast-rest.php` がmu-pluginsに設置済みであること（設置済み）
- 更新前に必ずローカルファイルの修正を保存してから実行する
- 大きな構造変更がある場合は削除→再投稿（`workflows/article-production.md` 参照）の方が確実
