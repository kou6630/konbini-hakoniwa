# 新しいバージョンを GitHub Releases に公開する（アプリの自動アップデートはこれを見に行く）
#
# 使い方（プロジェクトのフォルダで）:
#   1) npm version patch        ... バージョンを上げる（1.0.0 -> 1.0.1）。minor / major でも可
#   2) npm run release          ... ビルドして GitHub にアップロード
#   3) git push --follow-tags   ... バージョンのコミットとタグを GitHub に送る
#
# GitHub CLI (gh) にログイン済みなら、そのトークンを自動で使います。
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $env:GH_TOKEN) {
  if (Get-Command gh -ErrorAction SilentlyContinue) { $env:GH_TOKEN = (gh auth token) }
}
if (-not $env:GH_TOKEN) { throw 'GH_TOKEN がありません。gh auth login を実行するか、GH_TOKEN を設定してください。' }

npm run build:js
if ($LASTEXITCODE -ne 0) { throw 'ゲームのビルドに失敗しました' }
npx electron-builder --win --publish always
if ($LASTEXITCODE -ne 0) { throw 'インストーラの作成・アップロードに失敗しました' }

# 版番号が変わっても変わらない「固定名」のダウンロード用コピーも、同じリリースに載せる
#   https://github.com/kou6630/konbini-hakoniwa/releases/latest/download/KonbiniHakoniwa-Setup.exe
$version = (Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json).version
$src = "dist-installer\KonbiniHakoniwa-Setup-$version.exe"
$fixed = "dist-installer\KonbiniHakoniwa-Setup.exe"
Copy-Item $src $fixed -Force
gh release upload "v$version" $fixed --clobber -R kou6630/konbini-hakoniwa
if ($LASTEXITCODE -ne 0) { throw '固定名コピーのアップロードに失敗しました' }
Write-Host "公開しました: https://github.com/kou6630/konbini-hakoniwa/releases/latest/download/KonbiniHakoniwa-Setup.exe"
