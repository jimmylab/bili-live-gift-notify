# b站直播礼物通知 (油猴脚本)

## 安装方法

1. 首先安装TamperMonkey插件
   https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

2. 脚本安装/更新url

   https://raw.githubusercontent.com/jimmylab/bili-live-gift-notify/master/bili-live-gift-notify.user.js

   在地址栏中，右键“粘贴并转到”以上url，

3. 此时将出现TamperMonkey的安装提示界面，点击安装即可

---

## 使用方法

1. 进入直播间，等页面加载完成后，稍等几秒钟，页面左上角出现一个方框，礼物通知显示在这里

2. 双击方框切换全屏/半屏模式，拖拽可以移动位置，方框会自动吸附边缘。

### 推荐操作

   - 打开自己直播间，先将直播暂停，播放器静音，关闭弹幕（节约性能）
   - 双击方框切换为“全屏模式”
   - 按Alt+Tab键，新建桌面，将这个chrome窗口移动到桌面2，这样可以全程不最小化，且不干扰桌面1的操作了
   - 在obs中新建窗口捕获，选择相应窗口，勾选客户端区域
   - Alt拖动裁切至合适大小，右键滤镜，新增“色值”，降低不透明度

   舰长、礼物信息就能自动显示在直播画面中

---

## 自定义参数介绍

1. 在扩展程序中点击TamperMonkey的图标，点“管理面板”，显示所有已安装的脚本。

2. 点击本插件的名称，进入编辑模式

3. 找到 `// @include      /^https?://live\.bilibili\.com/\d+/` 这一行，

   删掉换成 `// @match https://live.bilibili.com/{您的房间号}`

   这样可以使脚本仅在自己直播间生效，避免影响您去其它直播间查房。推荐修改！

4. 找到 `const BACKGROUND_COLOR = '#FFFFFF'`

   更改此值可以修改背景框的颜色，以匹配您直播间的配色。以下都是可接受的格式：

   - `'#e33e33'`
   - `'#000'`
   - `'rgb(111, 222, 333)'`
   - `'rgba(255,255,255,0.5)'`
   - 甚至可以css注入渐变色：`'#e8aee4; background-image: linear-gradient(120deg, #e8aee4 0%, #d08fbc 60%, #8781dc 95%)'`

   直播时不建议使用半透明背景，会露出画面

5. 找到 `const EXPENSIVE_GIFT_ONLY = true;`

   此值为true时，只显示上船消息（舰长总督提督）、小电视、摩天大楼、天空之翼、礼花（更多礼物待更新）的提示。这是默认值。

   此值为false时，将提示所有金瓜子礼物

6. 最后别忘记Ctrl+S保存！

---

## 待改进

- [x] 全区广播过滤
- [ ] 礼物合并去重
- [ ] 礼物价格动态parse
- [ ] 低价大量礼物计数
- [ ] 保存用户设置（最好有图形界面）
- [ ] 允许手动打开/关闭，拖动resize
- [ ] 在UI上手动筛选礼物类型/手动删除礼物
- [ ] 逻辑优化
