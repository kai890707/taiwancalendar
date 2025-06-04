# 台灣國定假日與請假最大化攻略（2017-2025）

## 專案簡介
本專案提供 2017~2025 年台灣國定假日、補班日、最大連假與最佳請假攻略，包含：
- 各年度國定假日、補班日、連假一覽
- 最大化請假橫向視覺化表格
- 每月假日數量視覺化
- 請假建議與 FAQ
- RWD 響應式設計，手機/桌機皆適用

## 目錄結構
```
/assets/           # JS 資源
/transform_data/   # 各年度轉換後的 JSON 資料
/origin_data/      # 各年度原始 JSON 資料
2017.html ~ 2025.html  # 各年度主頁
index.html         # 年度總覽入口
calendar.html      # 行事曆頁
datatrasnform.html # 資料轉換工具頁
```

## 使用方式

1. 下載或 clone 本專案
2. 直接用瀏覽器開啟 `index.html` 或任一年度的 `20xx.html` 頁面
3. 若需更新資料，請將新的 JSON 放入 `origin_data/` 並執行資料轉換

## 重構計畫

當前使用HTML僅為快速建立repo，未來將使用PHP或Typescript進行重構。

## 資料來源
- [中華民國政府行政機關辦公日曆表](https://data.gov.tw/dataset/14718)
- [TaiwanCalendar](https://github.com/ruyut/TaiwanCalendar)
- [Taiwan-Calendar 臺灣行事曆](https://github.com/880831ian/taiwan-calendar)

## 貢獻
歡迎 PR、issue 或建議！

## License
MIT 