# Portfolio — Three.js grass meadow

Portfolio song ngữ VI/EN với nền đồng cỏ 3D (Three.js, GPU instancing) thay cho
hiệu ứng canvas 2D cũ. Nội dung chỉnh sửa qua trang Admin, lưu ở localStorage,
có xuất/nhập JSON.

## Chạy local

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build tĩnh vào dist/
npm run preview   # xem thử bản build
```

## Triển khai GitHub Pages

1. Tạo repo trên GitHub rồi push code:

   ```bash
   git init
   git add -A
   git commit -m "Portfolio with Three.js grass"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

2. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` sẽ tự build và deploy mỗi lần push lên `main`.

`vite.config.js` dùng `base: './'` nên build chạy được ở mọi đường dẫn
(`https://<user>.github.io/<repo>/`) không cần cấu hình thêm.

## Cấu trúc

- `index.html` + `src/main.js` — trang portfolio, render từ dữ liệu content
- `admin.html` + `src/admin.js` — trang quản lý nội dung (localStorage, xuất/nhập JSON)
- `src/grass.js` — đồng cỏ Three.js: ~65k lá cỏ instanced, gió nhiều lớp,
  tương tác con trỏ (cỏ rẽ ra + phát sáng), sương mù, parallax camera
- `src/content.js` — dữ liệu mặc định + đọc/ghi localStorage
- `src/i18n.js` — chuỗi giao diện VI/EN
- `docs/` — bản HTML gốc dùng làm tham chiếu thiết kế

## Ghi chú hiệu ứng cỏ

- Mật độ tự giảm trên thiết bị cảm ứng (26k lá), DPR giới hạn 1.75
- Tôn trọng `prefers-reduced-motion` (gió chậm lại, tắt parallax)
- Tab ẩn thì dừng vòng lặp render
- Không có WebGL → giữ nền gradient CSS
