Zheng Lee — Offline portfolio

1. Extract the entire ZIP to a folder.
2. Open index.html with a current version of Edge, Chrome, Firefox or Safari.
3. Keep the other files and the assets folder beside index.html.

No internet connection, Node.js, installation or local server is required.
The page includes its JavaScript, CSS, fonts, SVG icons and map data locally.
Map animation, city information, project details, skill expansion and navigation
work offline, including English, Simplified Chinese and Traditional Chinese.
Use the language icon at the top right to switch languages. Your choice is saved
on this device when browser storage is available. Chinese uses installed fonts.
Font licences and source checksums are in assets/fonts/.
Bootstrap Icons 1.13.1 SVGs, MIT licence and sources are in assets/icons/bootstrap/.

LinkedIn, GitHub and Medium links open external websites and need an internet connection.
Email links open your configured mail application; sending mail needs connectivity.
Opening the hosted website URL still requires an internet connection.

離線使用：完整解壓縮後，直接用瀏覽器開啟 index.html。
請保留同資料夾中的 JS、CSS、assets；不要只複製 index.html。
右上角語言圖示可切換英文、簡體中文及繁體中文，三種語言均可離線使用。
網頁功能可離線使用；LinkedIn、GitHub、Medium 及寄信仍需要網路。

Content is maintained in source mock/*.json and embedded during the build.
The offline API simulation pages historical work and skills, and opens project
detail on demand without AJAX. All fixture bytes are included in app.js.

Fixed UI text and locale/navigation/runtime settings live in src/locales and
src/config. The world map is src/assets/maps/world.svg, not API or database data.
Each mock request carries the active locale and returns only that language.

Site content is maintained in mock/site/en.json, zh-Hans.json and zh-Hant.json.
Each is a complete brand/profile/social/chatme object for one language.

The Palette icon provides Mint, Ice, Amber and Mist themes, heartbeat speed, highlight
intensity, pause and reset. Hosted pages store preferences in a cookie; file://
uses localStorage as a fallback. If storage is blocked, changes last only for
the current page. Reduced-motion settings disable the background animation.

右上 Palette 可調整薄荷、冰藍、琥珀、霧白，以及背景速度、強度與暫停。
網站以 Cookie 記憶；直接開啟離線檔案時使用本機儲存備份。

On desktop, use the double-arrow button above the navigation to collapse the
sidebar into an icon rail. Hover or focus an icon to show its translated title.
The page and background resize together; mobile keeps the full sliding drawer.
桌面雙箭頭可收合側欄；停留或聚焦圖示會顯示標題，手機維持完整滑動選單。
