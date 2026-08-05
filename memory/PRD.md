# REAL COFFEE ADİSYON — PRD

## Original problem statement (verbatim, Turkish)
"kahve dükkanımız için bir adiyon sistemine ihtiyacım var. sistemde masa olacak. gelen müşteri için masa seçeceğim. masa seçtikten sonra sipariş alacağım. sipariş ekranımda sıcak soğuk ve diğer ürünler adı altında üç farklı sınıf olacak. sıcak içeceklerdeki ürünlerde tall grande ve venti boylarında üç farklı fiyat seçeneği olacak. soğuk içeceklerde standart boy seçeneği olacak sadece. adisyonun ismi REAL COFFEE ADİSYON olsun. diğer ürünler kategorisi de tek fiyat olacak. ürünlerde fiyat isim gibi düzenlemeler silme veya ekleme yapabileceğim. sipariş ekranında toplam tutar olacak. öde butonuna basarsam fiş yazdırılacak. ekranda günlük ve aylık toplam satışı label halinde görebileceğim. istersem günlük ve aylık satılan ürünleri listelemek de istiyorum. bu proje geliştirilebilir olsun. müşteri masasadaki qr ı okutup sipariş verirse sipariş ekranıma düşsün. ama bu aşamaya sonra geçelim."

## User choices
- Masa sayısı: yönetim ekranından ekle/sil
- Giriş: basit şifre (varsayılan `1234`)
- Fiş: tarayıcı yazdırma penceresi (window.print)
- Örnek ürünler seed edilecek
- Para birimi: TL (₺)

## Personas
- **Barista / kasiyer**: masa seçer, sipariş alır, öder, fiş yazdırır
- **Yönetici**: ürün/masa yönetir, günlük & aylık raporları görür
- **Müşteri (QR)**: masa QR'ını okutup kendi siparişini garson ekranına düşürür

## Architecture
- Backend FastAPI + MongoDB (motor). Auth: single shared token via APP_PASSWORD (`1234` default). Endpoints prefixed `/api`.
- Frontend React (react-router 7) + Tailwind + shadcn/ui. Fonts: Outfit + DM Sans. Palette: warm sand `#F9F6F0`, espresso `#2C1F16`, terracotta accent `#C8664D`.
- QR customer flow uses public unauthenticated endpoints under `/api/public/*`.

## Implemented (2026-02)
- Login screen with password auth (`/api/auth/login`)
- Tables grid with open-order status + summary labels (daily/monthly totals)
- Order screen with 3 category tabs, size picker (Tall/Grande/Venti) for hot drinks, cart with qty +/- and delete
- Öde button → marks paid + browser print of formatted receipt (`#receipt-print`)
- Products CRUD (add/edit/delete, per-size prices or single price)
- Tables CRUD (open-order guard on delete) + per-table QR code image + link
- Reports: summary (daily/monthly totals & counts) + products sold list per period
- Public QR ordering: `/qr/:tableId` – customer sends items which auto-appear in staff cart via 5s poll
- Seed: 14 example products, 8 tables (Masa 1–8) on first login

## Backlog (P0/P1/P2)
- P1: SSE/WebSocket push for QR orders (instead of polling)
- P1: Ürün fotoğrafı yükleme (object storage), stok/adet takibi, indirim
- P2: Rol tabanlı çoklu kullanıcı (kasiyer / yönetici)
- P2: Aylık satış grafik (recharts)
- P2: Vergi/servis oranı, sipariş notu, fiş için restoran adres/telefon alanları
- P2: Gerçek termal yazıcı entegrasyonu (ESC/POS)

## Test credentials
`/app/memory/test_credentials.md` — password `1234`
