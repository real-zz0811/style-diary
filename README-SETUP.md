# STYLE DIARY · 配置与维护手册

> 这份文档记录了这个项目从「只能在自己电脑上跑」到「一个带账号、数据存云端、任何设备都能用的网站」需要做的全部事情。
> 遇到任何问题，先来这里找答案。

---

## 一、这个东西现在是什么结构

```
你的浏览器
   │
   ├── 网页界面（React + TypeScript + Tailwind）   ← 代码在 src/
   │
   └── 通过账号密钥访问 ──► Supabase 云端（新加坡 / 东京机房）
                                ├── 数据库：衣橱单品、搭配记录、灵感
                                ├── 账号系统：邮箱 + 密码
                                └── 图片存储：单品照片、搭配长图
```

**关键点**：照片和文字**都存在 Supabase 云端**，跟你的账号绑定。
所以——关掉浏览器、重启电脑、换一台设备、重装系统，只要还记得账号密码，登进去东西就都还在。

---

## 二、本地运行（开发时用）

```bash
npm install       # 第一次或换电脑后执行
npm run dev       # 启动，然后浏览器打开 http://localhost:5173/
```

其他常用命令：

```bash
npm run typecheck   # 检查类型错误
npm run build       # 打包出 dist/ 文件夹（部署用）
npm run preview     # 本地预览打包结果
```

> ⚠️ **重要**：`http://localhost:5173/` 这个地址**只有在 `npm run dev` 运行着的时候才能打开**。
> 它不是永久网址。想要一个随时能开的固定网址，看第六节「部署到公网」。

---

## 三、Supabase 配置（只需做一次）

### 3.1 注册与建项目

1. 打开 https://supabase.com ，用 GitHub 账号或邮箱注册
2. 点 **+ New project**，填写：
   - **Name**：随意，例如 `style-diary`
   - **Database Password**：点 Generate 生成后**保存好**（日常使用用不到，但别丢）
   - **Region**：⚠️ **选 `Southeast Asia (Singapore)` 或 `Northeast Asia (Tokyo)`**，离国内近，速度快
   - **Pricing Plan**：Free
3. 点 **Create new project**，等 1～2 分钟初始化完成

### 3.2 取得两个配置值

**路线 A：右上角 Connect 按钮**（最快）

1. 点项目页面右上角的 **Connect**（图标像插头/连接）
2. 左侧四个标签里点 **Framework**
3. 下方 **Follow these steps → 2 Add files** 的标签行里点 **`.env.local`**
4. 点那个代码块**右侧的复制图标**（会整段复制），或鼠标框选整段后按 Ctrl+C，粘贴到记事本就能看到完整的两行值

> ⚠️ 这个弹窗里的**框架下拉框默认可能是 Next.js**，那样变量名会显示成 `NEXT_PUBLIC_SUPABASE_URL` /
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。**名字不重要，值才是重点** —— 把 `=` 后面的值复制到我们
> 项目的 `.env.local` 里对应变量即可。想看 Vite 风格的名字，把下拉框切成 `Vite`/`React` 即可。

**路线 B：直连设置页**

打开 https://supabase.com/dashboard/project/kjrudrlhcynhfnsuqfds/settings/api-keys

- 新版界面：**Publishable key** 区块就是它（`sb_publishable_…`）
- 若看不到，点同页的 **Legacy API keys** 标签，里面的 **anon / public** 那一行（`eyJ…`）也一样能用

| 要复制的 | 长什么样 | 用途 |
|---|---|---|
| **Project URL** | `https://xxxxxxxx.supabase.co` | 定位你的项目 |
| **anon / publishable** key | 以 `eyJ` 开头的一长串，或 `sb_publishable_` 开头 | 前端访问密钥 |

> ❌ **不是**这两个的，都别填：`sb_secret_…`（管理员密钥）、项目 ID（如 `kjrudrlhcynhfnsuqfds` 这种短串）、数据库密码。

> 🔒 **安全说明**：这两个值**设计上就是可以公开的**，写在前端代码里也不会让别人偷走你的数据 ——
> 真正的隔离由数据库的「行级安全策略」保证：每个账号只能读写属于自己的那些记录。
>
> ❌ 但同一个页面里的 **service_role / secret key 绝对不要外传、也不要写进前端**，那是管理员级别的万能钥匙。

### 3.3 写入本地配置文件

在项目根目录创建文件 **`.env.local`**（这个文件已被 `.gitignore` 排除，不会被上传到 GitHub）：

```ini
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=在这里粘贴你的 anon / publishable key
```

> `VITE_SUPABASE_ANON_KEY` 这个名字一直有效；如果你更喜欢新控制台的名，
> 写 `VITE_SUPABASE_PUBLISHABLE_KEY=...` 也认（两个都写时以 `ANON_KEY` 为准）。

改完必须**重启** `npm run dev` 才会生效。

### 3.4 创建数据库表和存储桶

1. Supabase 控制台左侧 → **SQL Editor** → **New query**
2. 打开本项目的 `supabase/schema.sql`，**全部内容复制粘贴进去**
3. 点 **Run**，看到 "Success. No rows returned" 就成功了

这段脚本会创建：
- 三张表：`clothing`（单品）、`outfits`（搭配）、`inspirations`（灵感）
- 每个账号只能访问自己数据的**行级安全策略**
- 一个名为 `style-diary` 的图片存储桶（含"只能上传到自己目录"的限制）

> 这个脚本可以**重复执行**，不会重复建表或报错。

### 3.5 关掉邮箱验证（建议）

左侧 **Authentication → Providers → Email** → 把 **Confirm email** **关闭**。

原因：默认开启时，每次注册都要去邮箱点确认链接才能登录。自己用太折腾（收信延迟、进垃圾邮件很常见）。关掉后注册完直接就能登录。

---

## 四、日常使用

1. 启动服务：`npm run dev`（或访问部署后的网址）
2. 首次使用点「注册」创建一个账号
3. 之后每次打开，只要还处于登录状态就**直接进**，不用重新登录
4. 万一登录失效（比如清过浏览器数据），重新输邮箱密码登进去，**内容一条都不会少**

右上角的 ⤴ 图标是**退出登录**。

**删除记录**：在衣橱、灵感墙、搭配工坊里，**手机长按图片**或**电脑在图片上点右键**，会弹出确认框；确认后记录和它在云端的图片会一起清理（不可撤销）。删除搭配只会删掉那条记录和它的合成长图，组成它的单品照片属于衣橱里的单品，不会被删。

**从旧版本搬数据**：如果浏览器里还留着老版本（纯本地存储）的数据，登录后页面顶部会出现一条「检测到本机有 N 条旧记录尚未上云」的横幅，点「导入到云端」即可连同图片一起搬到云账号下。全部成功才会清掉本地旧数据；中途失败会保留原数据，可以再点一次重试。

---

## 五、换设备 / 换浏览器

在任意设备打开网址 → 输入**同一个邮箱和密码** → 你的衣橱、搭配、灵感全都在。

这就是接云端账号的核心价值：数据跟着账号走，不跟着设备走。

---

## 六、部署到公网（获得固定网址）

做完这一步，你就能像用其他网站一样，不受"有没有开着 dev 服务"限制。

### 6.1 打包

```bash
npm run build      # 产出 dist/ 文件夹
```

### 6.2 托管（二选一，都免费）

**方式 A：Netlify Drop（最简单，不用懂 git）**
1. 打开 https://app.netlify.com/drop
2. 把整个 **`dist` 文件夹**拖进去
3. 等几秒，得到一个固定网址，如 `https://xxxx.netlify.app`

**方式 B：Vercel（能自动更新，推荐长期用）**
1. 把代码推到 GitHub 私有仓库
2. 到 https://vercel.com 用 GitHub 登录 → Import 这个仓库
3. 在 **Environment Variables** 里添加和 `.env.local` 相同的两个变量
4. 之后每次推送代码，Vercel 自动重新部署

### 6.3 部署后必做的三件事

1. **在部署平台配置环境变量**（`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`）
   否则线上页面会显示「尚未接入云端账号」
2. **关闭公开注册**：Supabase 控制台 → Authentication → Sign In / Providers → 关闭 "Allow new users to sign up"
   否则任何知道网址的人都能注册账号
3. **配置允许的回调地址**：Authentication → URL Configuration → 把线上域名填进 Site URL

---

## 七、必须知道的几个限制

| 事项 | 说明 |
|---|---|
| **免费额度** | 数据库 500MB、文件存储 1GB、5 万月活用户。纯个人使用完全够（以官网当前条款为准） |
| **闲置暂停** | 免费项目长期无人访问会被自动暂停，**数据不会丢**，登录控制台点一下即可唤醒 |
| **图片自动压缩** | 上传的图片和搭配长图会自动压到长边 1600px / JPEG 质量 0.85，体积减少 90% 以上，显示效果几乎无差别 |
| **删除记录** | 手机长按图片 / 电脑在图片上点右键即可删除，记录与云端图片一起清理；图片删不掉只会留一条控制台警告，不影响记录本身已删除 |
| **图片残留** | 极端情况（网络中断、Storage 权限异常）下云端图片可能没删干净，不影响使用，可在 Supabase → Storage 里手动清理 |
| **密码** | 忘记密码需要邮箱重置功能，目前界面未提供入口，可到 Supabase 控制台 → Authentication → Users 里处理 |

---

## 八、常见问题

**Q：登录进去后一片空白 / 一直转圈？**
A：多半是没执行 `supabase/schema.sql`（表不存在），或者 anon key 填错了。按 F12 打开 Console 看红色报错。

**Q：注册后提示「邮箱还没验证」？**
A：第三节 3.5 没关掉 Confirm email。去 Supabase 关掉，或者去邮箱点确认链接。

**Q：以前浏览器里存的数据去哪了？**
A：旧数据仍在浏览器的本地存储里，未被删除。登录后页面顶部会出现「检测到本机有 N 条旧记录尚未上云」的横幅，点「导入到云端」即可把它们连同图片一起搬到云端账号下（实现见 `src/lib/migrateLocalData.ts` 与 `src/components/LegacyMigrationBanner.tsx`）。全部导入成功才会清掉本地旧数据，失败会保留以便重试。

**Q：想删掉一条记录怎么操作？**
A：手机**长按**图片、电脑在图片上**点右键**，弹出确认框后点「删除」。如果长按没反应，试试按住别动约半秒（手指稍微移动会被当成滚动页面而取消）。

**Q：`localhost:5173` 打不开或端口变成 5174 了？**
A：5173 被别的程序占用时 Vite 会自动换端口。注意**不同端口/域名属于不同站点，登录状态不通用**，重新登录即可。

**Q：想把数据导出保存一份？**
A：可到 Supabase 控制台 → Table Editor 逐表导出 CSV，或使用 Database → Backups。

---

## 九、代码结构

```
src/
├── pages/
│   ├── LoginPage.tsx          登录 / 注册
│   ├── WardrobePage.tsx       衣橱
│   ├── OutfitWorkshopPage.tsx 搭配工坊（含长图合成）
│   └── InspirationWallPage.tsx 灵感墙
├── components/
│   ├── ImageUpload.tsx        上传（压缩 → 上传云端 → 返回网址）
│   ├── Modal.tsx
│   ├── BottomNavigation.tsx
│   └── LegacyMigrationBanner.tsx  提示把旧本地数据导入云端
├── contexts/
│   └── AuthContext.tsx        登录状态管理
├── hooks/
│   ├── useCloudData.ts        云端读写（衣橱 / 搭配 / 灵感三个 hook）
│   └── useLongPress.ts        长按 / 右键手势（删除入口）
├── lib/
│   ├── supabase.ts            Supabase 客户端
│   ├── imageStorage.ts        图片压缩、上传、删除
│   ├── migrateLocalData.ts    旧本地数据迁移
│   ├── authErrors.ts          报错信息中文化
│   └── id.ts                  记录 id 生成
└── types/index.ts             数据类型

supabase/schema.sql            数据库建表脚本（第三节 3.4 用）
```

---

## 十、搭配长图的排版参数

长图由 Canvas 在浏览器里合成（`OutfitWorkshopPage.tsx` 顶部常量）。想微调打开这个文件改常量即可：

| 常量 | 作用 |
|---|---|
| `MAIN_IMAGE_WIDTH` / `MAIN_IMAGE_HEIGHT` | 主体单品绘制尺寸（400×500） |
| `CANVAS_PADDING` / `CANVAS_BORDER` | 画布内边距与边框 |
| `ACCESSORY_SIZE` | 配饰浮层大小（150px） |
| `ACCESSORY_GAP` | 配饰与主体图的间隙。**改成负数**可得到"骑在主体边缘"的杂志叠压效果，且不会越出画布 |
| `ACCESSORY_UPPER_RATIO` / `ACCESSORY_LOWER_RATIO` | 配饰的垂直位置（0.25 = 上部四分之一处） |
