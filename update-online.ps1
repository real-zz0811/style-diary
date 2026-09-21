# update-online.ps1 —— 一条命令更新线上版本（不需要 GitHub）
#
# 用法（在项目根目录）：
#   powershell -ExecutionPolicy Bypass -File .\update-online.ps1
#
# 作用：先本地构建，再把构建结果发布到 Netlify 生产环境。
# 网址保持不变；如果哪一步失败，线上仍是上一个正常版本，不会变坏。

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# 关掉构建时“caniuse-lite 数据过期”的提示（它走 stderr，看起来像报错，容易吓人）
$env:BROWSERSLIST_IGNORE_OLD_DATA = '1'

Write-Host '[1/2] 构建生产包：npm run build' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host '构建失败，已中止（线上版本未受影响，仍是上一次成功发布的版本）' -ForegroundColor Red
  exit 1
}

Write-Host '[2/2] 发布到 Netlify 生产环境：npx netlify-cli deploy --prod --no-build --dir=dist' -ForegroundColor Cyan
npx netlify-cli deploy --prod --no-build --dir=dist
if ($LASTEXITCODE -ne 0) {
  Write-Host '发布失败，请把上面的报错发我' -ForegroundColor Red
  exit 1
}

Write-Host '完成！打开你的 Netlify 网址刷新即可看到新版本（网址不变）。' -ForegroundColor Green
exit 0
