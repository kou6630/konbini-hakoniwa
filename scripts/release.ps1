# 新しいバージョンを GitHub Releases に公開する（アプリの自動アップデートはこれを見に行く）
#
# 使い方（プロジェクトのフォルダで）:
#   1) npm version minor --no-git-tag-version   ... バージョンを上げる（1.1.0 -> 1.2.0）。patch / major でも可
#   2) git add -A; git commit -m "v1.2.0: ..."; git tag v1.2.0; git push origin main; git push origin v1.2.0
#   3) npm run release                          ... ビルドして GitHub にアップロード
#
# GitHub CLI (gh) にログイン済みなら、そのトークンを自動で使います。
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$repo = 'kou6630/konbini-hakoniwa'

if (-not $env:GH_TOKEN) {
  if (Get-Command gh -ErrorAction SilentlyContinue) { $env:GH_TOKEN = (gh auth token) }
}
if (-not $env:GH_TOKEN) { throw 'GH_TOKEN がありません。gh auth login を実行するか、GH_TOKEN を設定してください。' }

$version = (Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json).version
$tag = "v$version"

# 先に GitHub 側のリリースを1つ作っておく（アップロードが同時に走って、同じ版のリリースが二重にできるのを防ぐ）
$ErrorActionPreference = 'Continue'
gh release view $tag -R $repo *> $null
$exists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = 'Stop'
if (-not $exists) {
  gh release create $tag -R $repo --title $version --generate-notes
  if ($LASTEXITCODE -ne 0) { throw 'GitHub のリリース作成に失敗しました' }
}

npm run build:js
if ($LASTEXITCODE -ne 0) { throw 'ゲームのビルドに失敗しました' }
npx electron-builder --win --publish always
if ($LASTEXITCODE -ne 0) { throw 'インストーラの作成・アップロードに失敗しました' }

# 版番号が変わっても変わらない「固定名」のダウンロード用コピーも、同じリリースに載せる
#   https://github.com/kou6630/konbini-hakoniwa/releases/latest/download/KonbiniHakoniwa-Setup.exe
$src = "dist-installer\KonbiniHakoniwa-Setup-$version.exe"
$fixed = "dist-installer\KonbiniHakoniwa-Setup.exe"
Copy-Item $src $fixed -Force
gh release upload $tag $fixed --clobber -R $repo
if ($LASTEXITCODE -ne 0) { throw '固定名コピーのアップロードに失敗しました' }
gh release edit $tag --latest -R $repo
Write-Host "公開しました: https://github.com/$repo/releases/latest/download/KonbiniHakoniwa-Setup.exe"
