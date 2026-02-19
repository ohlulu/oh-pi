# pi-extension

簡單的 pi extension 專案起手式。

## 目標

- 建立一個可被 pi 載入的 extension
- 先做最小可行版本（MVP）

## 快速開始

1. 建立 extension 檔案：
   - `./.pi/extensions/my-extension.ts`
2. 在 pi 內執行 `/reload` 重新載入
3. 測試 extension 是否生效

## 最小範例

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("my-extension loaded", "info");
  });
}
```

## 下一步

- 加一個自訂 command（例如 `/hello`）
- 加一個自訂 tool
- 補上測試與使用說明
