# M3U Hub

Web app tĩnh để biến playlist M3U bóng đá/IPTV thành danh sách **theo trận đấu** có thể tìm kiếm, lọc, kiểm tra độ sống và xuất nhanh cho VLC.

**App không kèm playlist nào.** Không có link mặc định, không có danh sách kênh, không có URL stream nào trong repo hay trong bản build — bạn dán link M3U của mình vào modal **Link** (link nằm trong `localStorage` của trình duyệt bạn). Playlist của một provider thật thường có hàng trăm `#EXTINF` và hàng chục nhóm kênh; VLC không giữ được nhóm kênh nên mỗi lần tìm trận phải mò tay — app này lo phần **tìm**, còn **xem** vẫn là VLC.

## Tính năng

- **Gom theo trận**: cùng **thời điểm bắt đầu** (instant, không phải chuỗi giờ) + cặp đội được gộp thành một card. So khớp đội: bỏ dấu, prefix, Levenshtein, **viết tắt (QPR/PSG)**, **alias CLB (Spurs/Tottenham)**, Jaccard ≥ 0.5; khác môn thể thao thì không gộp. `Manchester City` và `Man City` gộp; `Manchester United` tách riêng.
- **Tìm kiếm không dấu** (debounce 150ms) trên tên đội, bình luận viên, tên nguồn và tiêu đề gốc.
- **Lọc** gọn trong một sheet mở bằng nút **Lọc** (badge = số bộ lọc đang bật): trạng thái (đang diễn ra / sắp tới / đã xong), ngày (hôm nay / ngày mai), môn, nhóm kênh, bình luận viên, ẩn nguồn `no-signal` (mặc định bật), chỉ trận còn nguồn sống, và chọn giờ hiển thị (giờ VN / giờ máy).
- **Mở VLC**: nút chính gọi protocol `m3uhub://` để mở **app VLC trên máy** (cài một lần bằng bộ cài tải từ app, không cần repo, không cần admin); vẫn có nút **Tải .m3u** cho máy chưa cài — file `.m3u` một nguồn (hoặc cả trận / cả danh sách đang lọc) giữ `#EXTINF group-title`, `#EXTVLCOPT:http-referrer` và `http-user-agent`. Xem thêm [Mở VLC trực tiếp](#mở-vlc-trực-tiếp).
- **Xem trong trình duyệt** (hls.js, lazy-load): mở ra **player toàn màn hình** — thanh điều khiển tự ẩn sau 3 giây (chạm để hiện lại), phát/dừng, tắt tiếng + âm lượng, **xoay 0°/90°/180°/270°** (xoay hình, không phụ thuộc cảm biến máy), toàn màn hình (thử khoá ngang trên điện thoại), cửa sổ nổi (PiP). Phím tắt: `Space` phát/dừng · `F` toàn màn hình · `R` xoay · `M` tắt tiếng · `Esc` đóng. Stream lỗi thì hiện nút **Mở bằng VLC**.
- **Kiểm tra link**: mỗi lần tải gọi `checkPlaylist()` → `OK / EMPTY / HTTP_ERROR / NETWORK_ERROR / TIMEOUT`. Link chết/rỗng sẽ hiện modal chặn với lý do, ô nhập link mới, nút **Kiểm tra** (validate tại chỗ trước khi lưu) và **Dùng dữ liệu đã lưu** (chỉ bật khi có cache).
- **Cache offline**: playlist thô + thời điểm tải lưu trong `localStorage`; app vẫn dùng được khi link chết/mất mạng (phải bấm chọn rõ ràng, không tự fallback).
- **Tự kiểm tra lại mỗi 15 phút** khi tab đang mở. Sức khoẻ playlist chỉ hiện trên thanh trên dưới dạng một dòng nhỏ khi có vấn đề (link lỗi, đang dùng cache, mốc cập nhật quá cũ) — bình thường không chiếm chỗ.
- **Giao diện tối tối giản**: một hàng header, một hàng lọc, danh sách mỗi trận một dòng; màu **than chì + hổ phách** (`#f59e0b` là accent duy nhất — dot trạng thái, pill LIVE, nút chính, thanh tiến trình). Trận đang diễn ra được viền hổ phách kín 4 cạnh + nền ám nhẹ + cạnh trái dày 3px (vẽ bằng `box-shadow` inset nên chiều cao dòng không đổi giữa các trạng thái). Toàn bộ copy tiếng Việt.

## Cài đặt & chạy

Yêu cầu: Node.js 18+ (đã test với Node 24).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + build vào dist/
npm run preview  # xem bản build
npm run test     # vitest, chạy trên fixture thật + các ca dựng tay
```

## Triển khai (GitHub Pages)

- Bản công khai: **https://kennethtran91.github.io/m3u-hub/** — đây là **project page**, nên app nằm dưới subpath `/m3u-hub/`.
- `vite.config.ts` đặt `base = '/m3u-hub/'` cho bản build production (`vite build` và `vite preview`); dev server và vitest vẫn dùng `'/'`. Muốn đổi tên repo/đường dẫn thì không cần sửa file: `BASE_PATH=/ten-repo/ npm run build` (luôn có đúng một dấu `/` ở cuối, không bao giờ thành `//`).
- **Nguồn Pages phải là “GitHub Actions”**: Settings → Pages → Build and deployment → Source = **GitHub Actions**. Không có nhánh `gh-pages`, không dùng thư mục `docs/`.
- Workflow: `.github/workflows/deploy.yml` chạy khi push lên `main` (và chạy tay bằng *Run workflow*): Node 20 → `npm ci` → `npm run test` → `npm run build` → upload `dist/` → deploy. Mỗi push lên `main` tự cập nhật site.
- Tải bộ cài VLC **vẫn hoạt động** trên bản đã deploy: link được dựng từ `import.meta.env.BASE_URL`, nên trỏ đúng `https://kennethtran91.github.io/m3u-hub/downloads/install-m3uhub-vlc.cmd`. GitHub Pages phục vụ file `.cmd` dưới dạng **file tải về** (không render), double-click là cài được — không cần repo, không cần admin.
- App không có client-side routing nên không cần `404.html`; mọi đường dẫn đều là file tĩnh trong `dist/`.

## Link playlist được lưu/thay thế như thế nào

- **Không có link mặc định.** Lần đầu mở app, modal chặn hiện ô nhập link với tiêu đề “Dán link playlist của bạn”. Link chỉ được ghi vào `localStorage` sau khi bạn bấm **Kiểm tra** (link phải trả về ít nhất một nguồn dùng được) rồi **Lưu link mới**.
- Tất cả trạng thái nằm trong **một key có version**: `m3u-hub.v1` → `{ playlistUrl, cache: { text, fetchedAt }, prefs: { hideNoSignal, onlyAlive, lastGroup, timezone } }`.
- Bấm nút **Link** trên thanh trên để mở hộp thoại: dán link mới → **Kiểm tra** (hiện kết quả + số nguồn/nhóm ngay trong modal) → **Lưu link mới** (ghi localStorage rồi tải lại).
- Khi link chết, modal chặn hiện lý do (`HTTP 200 nhưng 0 nguồn dùng được`, `HTTP 404`, `Không kết nối được`, `Quá 20 giây`…). Chọn **Dùng dữ liệu đã lưu** để tiếp tục với bản cache; app hiện “Dữ liệu lưu lúc HH:MM DD/MM”.
- Không có backend, không có API key: trình duyệt fetch trực tiếp link bạn dán (link phải cho phép CORS).

## Kiểm thử

`npm run test` — **83 test** (playlist 22, time 10, matches 19, commentators 11, vlc 9, playability 6, installer 6), chạy trên **snapshot tổng hợp** do `src/lib/__tests__/snapshot.ts` sinh ra (15 tài liệu M3U nối nhau, 730 `#EXTINF` = 729 nguồn + 1 mốc `Updated`, 14 nhóm kênh, 200 URL `no-signal` trong đó 199 nguồn chết, đủ `hls`/`flv`/`rtmp`):

- Snapshot dùng URL `example.test` và tên nhóm tự đặt — repo **không** chứa playlist, URL stream hay thương hiệu của provider nào. `buildSnapshot()` ném lỗi nếu số liệu lệch khỏi hằng số trong `SNAPSHOT`, nên các con số test assert là hợp đồng chứ không phải dữ liệu của người khác.
- Parser: 730 mục = **729 nguồn + 1 mốc `Updated`**; giá trị `group-title` = 14 nhóm kênh + mốc cập nhật; nhóm `Kênh Chết TV` chết toàn bộ (138/138 nguồn `no-signal`).
- Mốc `Updated 21/11 20:23` được tách thành `playlistUpdatedAt`, không tạo Match.
- Fixture ghim `Manchester City vs Fulham 19:30 21/11` gộp 13 nguồn / 8 nhóm kênh; `Man City` gộp với `Manchester City`, không gộp `Manchester United`.
- **Múi giờ / kickoff instant**: `19:30 21/11` (giờ VN) = 12:30 UTC bất kể TZ máy; mốc `Updated` cũng là instant; kickoff sáng sớm qua ranh giới tháng vẫn đúng; ngày không tồn tại bị loại; năm lùi khi ngày VN vượt 183 ngày.
- **Nhãn ngày không phụ thuộc TZ**: 23:30 VN là “Hôm nay”, 00:30 VN là “Ngày mai” tại 23:50 VN; hiển thị “giờ VN” mặc định, “giờ máy” chỉ khi chọn.
- **Gộp viết tắt / alias**: `QPR` ↔ `Queens Park Rangers`, `Spurs` ↔ `Tottenham Hotspur`, `PSG` ↔ `Paris Saint Germain`, `LOSC Lille` ↔ `Lille OSC`, `Lyon` ↔ `Olympique Lyonnais`, `Dep. La Coruna` ↔ `RC Deportivo`; và **không gộp** `Manchester United`/`Manchester City`, `Galatasaray`/`Ziraat Bankasi`, `Power Rangers` (esport)/CLB bóng đá, `Real Madrid`/`Real Betis`, `Santos Laguna`/`Santos`, `Bayer Leverkusen`/`Bayern Munich`, `Bologna`/`Bolton`, `Inter Miami`/`Internazionale`; **không gộp khác môn** dù cùng giờ.
- Health check: EMPTY với playlist toàn `no-signal`; HTTP_ERROR, NETWORK_ERROR, TIMEOUT (fetch giả + timeout 30ms).
- Export: `buildM3U()` round-trip qua parser, giữ nguyên URL/group/referrer/user-agent.
- Installer: payload base64 trong `install-m3uhub-vlc.cmd` giải mã ra **byte-identical** `handler.ps1` (kèm BOM), và link trong README khớp `BASE_URL`.

## Cấu trúc

```
src/
  lib/playlist.ts   parse M3U + checkPlaylist (thuần, không DOM)
  lib/matches.ts    gom trận, fuzzy team match, trạng thái live
  lib/export.ts     sinh M3U cho VLC
  lib/vlc.ts        URI m3uhub:// + kiểm tra/giải mã (khớp handler.ps1)
  lib/storage.ts    localStorage (key m3u-hub.v1)
  lib/time.ts       giờ/ngày, cửa sổ live, bỏ dấu
  lib/download.ts   Blob download + copy clipboard
  lib/__tests__/snapshot.ts  sinh playlist tổng hợp cho test (không chứa dữ liệu provider)
  hooks/            usePlaylist, useNow, useDebouncedValue
  components/       TopBar, FilterBar, FilterSheet, MatchCard, PlayerModal, LinkModal, …
```

## Mở VLC trực tiếp

Nút **Mở VLC** trên mỗi nguồn không tải file nữa: nó mở app VLC đã cài trên máy, qua protocol Windows `m3uhub://`. Vì protocol này đăng ký theo **user hiện tại (HKCU)**, **phải cài lại trên từng máy / từng user Windows** mở app — không có cách nào đăng ký "toàn cục" mà không cần admin. **Chỉ chạy trên Windows**: macOS/Linux không hỗ trợ đường này (dùng nút "Tải .m3u" rồi mở bằng VLC tay).

**Cách hoạt động**

1. App dựng URI `m3uhub://play?u=<url stream>&r=<referrer>&a=<user-agent>&t=<tiêu đề>` (mọi giá trị đều `encodeURIComponent`, không có khoảng trắng thô).
2. Windows tra `HKCU\Software\Classes\m3uhub` rồi chạy handler:
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%LOCALAPPDATA%\m3u-hub\handler.ps1" "%1"`
3. `handler.ps1` giải mã query, kiểm tra URL, tìm `vlc.exe` (App Paths HKLM → HKCU → WOW6432Node → `C:\Program Files\VideoLAN\VLC\vlc.exe` → `C:\Program Files (x86)\VideoLAN\VLC\vlc.exe`) rồi chạy:
   `vlc.exe <url> --http-referrer=<r> --http-user-agent=<a>` (tham số rỗng được bỏ qua).

**Cài đặt — cách 1, không cần repo (khuyến nghị cho người nhận app)**

Trong modal **Link** (nút "Link" trên thanh trên), khối "Mở bằng VLC" có nút **Tải bộ cài cho máy này** → tải `install-m3uhub-vlc.cmd` (file tĩnh trong `public/downloads/`, phục vụ tại `<BASE_URL>downloads/install-m3uhub-vlc.cmd` — `/m3u-hub/downloads/…` trên bản Pages, không cần backend). Double-click file đó: nó tự ghi `handler.ps1` vào `%LOCALAPPDATA%\m3u-hub\handler.ps1` và đăng ký registry — không cần repo, không cần quyền admin, không có kết nối mạng nào trong lúc cài (handler được nhúng sẵn trong file .cmd dưới dạng base64).

**Cài đặt — cách 2, khi đang có bản clone của dự án**

```bat
protocol\register.cmd
```

Script tự tìm thấy thư mục của nó (`%~dp0`), copy `handler.ps1` ra `%LOCALAPPDATA%\m3u-hub\handler.ps1`, đăng ký registry trỏ vào **bản copy đó** (không trỏ vào đường dẫn clone) nên đăng ký vẫn đúng dù clone bị xoá hay di chuyển sau này; in ra đúng key đã ghi, báo nếu máy chưa có VLC. Gỡ bằng `protocol\unregister.cmd` (xoá key `HKCU\Software\Classes\m3uhub`, rồi — chỉ khi key đã xoá xong — xoá luôn `%LOCALAPPDATA%\m3u-hub`). Chạy lại `register.cmd` nhiều lần cũng không sao (idempotent).

**Nếu chưa có VLC**: handler ghi lỗi vào `%LOCALAPPDATA%\m3u-hub\vlc-handler.log` và hiện hộp thoại báo thiếu VLC kèm link tải `https://www.videolan.org/vlc/`. Trong app, dùng nút **Tải .m3u** để tải playlist rồi mở bằng VLC ở máy khác.

**Referrer vẫn cần thiết**: stream vẫn có thể yêu cầu `http-referrer`/`user-agent` (một số kênh chặn nếu thiếu) và phần lớn bị **geo-block** ngoài Việt Nam — VLC mở được nhưng hình có thể không lên. Handler truyền đúng `--http-referrer` và `--http-user-agent`; đó là lý do vẫn nên dùng nút này thay vì copy link thủ công.

**Bảo mật**: bất kỳ trang web nào cũng có thể gọi `m3uhub://` (giống mọi custom protocol), nhưng handler chỉ nhận URL stream `http`/`https`/`rtmp` có host, từ chối giá trị bắt đầu bằng `-` (chống chèn tham số VLC), ký tự điều khiển, dấu `"` và giá trị quá dài. Không có tham số nào được truyền nguyên xi vào dòng lệnh ngoài URL stream + 2 header đã kiểm tra, nên trường hợp xấu nhất chỉ là VLC mở một URL mà người dùng vẫn có thể tự mở.

**Gỡ bỏ hoàn toàn**: xoá key registry `HKCU\Software\Classes\m3uhub` (qua `unregister.cmd` hoặc `reg delete`) và xoá thư mục `%LOCALAPPDATA%\m3u-hub` (chứa `handler.ps1` + log `vlc-handler.log`).

## Giới hạn đã biết

- **Không kèm playlist**: app không host, không nhúng và không phân phối stream nào; bạn tự chịu trách nhiệm về nguồn mình dán vào. Chỉ dùng nguồn bạn có quyền truy cập.
- **Geo-block**: phần lớn stream chặn ngoài Việt Nam. Phát trong trình duyệt có thể lỗi dù VLC vẫn chạy (VLC gửi được referrer, trình duyệt thì không).
- **RTMP** không phát được trong trình duyệt — nút “Xem” bị tắt, dùng file `.m3u` + VLC.
- Trình duyệt không gửi header `referrer`/`user-agent` tùy biến; đây là lý do chính khiến “Xem trong web” thất bại. File xuất cho VLC có đủ header.
- Giờ trong playlist là **giờ Việt Nam (UTC+7, không có DST)**, được parse thành **instant tuyệt đối**. UI hiển thị **“giờ VN”** theo mặc định, có nút chuyển sang **“giờ máy”**; trạng thái LIVE tính trên instant nên đúng ở mọi múi giờ của máy.
- Playlist của provider đổi nội dung hàng ngày; link bạn dán có thể trả về trang “no signal” thay vì M3U. App phát hiện và yêu cầu nhập link mới, không âm thầm dùng dữ liệu cũ.
- Không có tìm kiếm phía server, không lưu tài khoản; mọi thứ nằm trong localStorage của trình duyệt.
