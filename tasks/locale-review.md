# Locale sourcing

The 38 locales (the first eight, es, fr, de, pt-BR, it, ja, ko and zh-Hans, and 30 more below) are complete translations and ship in the package. This file records how each label was sourced, so a label can be spot-checked on a device later. The design and the checks are in [docs/api.md](../docs/api.md#localization) and [docs/authoring-guides.md](../docs/authoring-guides.md).

Labels come from `labels/`, and each non-English value has an `_src` record. Most are from vendor documentation or Chromium translation files. The rest are `model-translation`: written from knowledge of how that product shows the string in that language, because no source text was to hand. Every `_src` has `deviceChecked: false`.

Prose lives in `guides/*/*/*/layout-1/locales/<tag>.json`. Control names in `intro`, `completion` and steps use `{label:id}`. `alt`, `svgTitle` and `svgDesc` are copied as written, so they hold the label text as plain text. Edge's completion sentences name controls that have no label ("Open", "Details", "Pin to taskbar") and are plain translated text.

## Model-translated labels

Labels per locale: model-translated / all browser and OS labels.

| Locale | Model-translated | Labels |
| --- | ---: | ---: |
| es | 19 | 61 |
| fr | 16 | 61 |
| de | 7 | 61 |
| pt-BR | 15 | 61 |
| it | 11 | 61 |
| ja | 13 | 61 |
| ko | 16 | 61 |
| zh-Hans | 8 | 61 |
| nl | 8 | 61 |
| pl | 7 | 61 |
| sv | 11 | 61 |
| da | 11 | 61 |
| nb | 9 | 61 |
| fi | 8 | 61 |
| ru | 10 | 61 |
| uk | 6 | 61 |
| tr | 9 | 61 |
| cs | 11 | 61 |
| sk | 9 | 61 |
| hu | 9 | 61 |
| ro | 10 | 61 |
| hr | 23 | 61 |
| el | 10 | 61 |
| pt-PT | 19 | 61 |
| es-419 | 8 | 61 |
| fr-CA | 15 | 61 |
| zh-Hant | 6 | 61 |
| zh-HK | 7 | 61 |
| id | 11 | 61 |
| ms | 15 | 61 |
| th | 16 | 61 |
| vi | 10 | 61 |
| hi | 21 | 61 |
| ca | 19 | 61 |
| he | 12 | 61 |
| ar | 16 | 61 |
| bg | 19 | 61 |
| sl | 31 | 61 |

A dot means the label has a documented source.

| Label | English | es | fr | de | pt-BR | it | ja | ko | zh-Hans |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| android-chrome.create-shortcut | Create shortcut | · | · | · | · | · | ショートカットを作成 | · | · |
| edge-desktop.apps | Apps | · | · | · | · | · | · | 앱 | · |
| edge-desktop.install-this-site-as-an-app | Install this site as an app | · | · | · | · | · | · | 이 사이트를 앱으로 설치 | · |
| edge-desktop.install-app | Install app | · | Installer l’application | · | Instalar aplicativo | · | · | · | · |
| edge-desktop.cancel | Cancel | · | Annuler | · | Cancelar | · | · | · | · |
| edge-desktop.install | Install | · | Installer | · | Instalar | · | · | · | · |
| ios-safari.page-menu | Page Menu | Menú de página | · | · | · | · | ページメニュー | · | · |
| ios-safari.show-reader | Show Reader | Mostrar Lector | · | · | · | · | · | · | · |
| ios-safari.summarise | Summarise | Resumir | · | · | · | · | · | · | 摘要 |
| ios-share-sheet.share | Share | Compartir | · | · | · | · | · | · | · |
| ios-share-sheet.view-more | View More | Ver más | Afficher plus | Mehr anzeigen | Ver Mais | Mostra altro | さらに表示 | 더 보기 | · |
| ios-share-sheet.view-less | View Less | Ver menos | Afficher moins | Weniger anzeigen | Ver Menos | Mostra meno | 表示を減らす | 덜 보기 | 查看更少 |
| ios-share-sheet.add-bookmark-to | Add Bookmark to… | · | · | · | · | · | · | 북마크 추가 위치 | · |
| ios-share-sheet.find-on-page | Find on Page | Buscar en la página | Rechercher sur la page | · | Buscar na Página | Trova nella pagina | ページ内を検索 | 페이지에서 찾기 | 在页面上查找 |
| ios-share-sheet.page-zoom | Page Zoom | Zoom de la página | · | · | · | · | ページのズーム | · | · |
| ios-share-sheet.add-to-favorites | Add to Favorites | Añadir a favoritos | Ajouter aux favoris | Zu Favoriten hinzufügen | Adicionar aos Favoritos | Aggiungi ai preferiti | お気に入りに追加 | 즐겨찾기에 추가 | · |
| ios-share-sheet.markup | Markup | Marcación | · | · | · | · | · | · | · |
| ios-share-sheet.print | Print | Imprimir | Imprimer | · | Imprimir | Stampa | プリント | 프린트 | · |
| ios-share-sheet.add-to-new-quick-note | Add to New Quick Note | Añadir a nota rápida nueva | Ajouter à une nouvelle note rapide | · | Adicionar a Nova Nota Rápida | Aggiungi a nuova nota veloce | 新規クイックメモに追加 | 새로운 빠른 메모에 추가 | 添加到新快速备忘录 |
| ios-share-sheet.open-in-safari | Open in Safari | Abrir en Safari | Ouvrir dans Safari | In Safari öffnen | Abrir no Safari | Apri in Safari | · | Safari에서 열기 | 在 Safari 浏览器中打开 |
| macos-menubar.edit | Edit | Edición | Édition | Bearbeiten | Editar | Modifica | 編集 | 편집 | 编辑 |
| macos-menubar.view | View | · | Présentation | · | · | · | · | · | · |
| macos-safari.new-window | New Window | Nueva ventana | Nouvelle fenêtre | · | · | · | · | 새로운 윈도우 | · |
| macos-safari.new-tab | New Tab | Nueva pestaña | Nouvel onglet | · | Nova Aba | Nuova scheda | 新規タブ | 새로운 탭 | · |
| macos-safari.open-location | Open Location… | Abrir ubicación… | Ouvrir l’adresse… | Adresse öffnen … | Abrir Local… | Apri posizione… | 場所を開く… | 위치 열기… | 打开位置… |
| macos-safari.add-to-dock-item | Add to Dock… | Añadir al Dock… | · | · | Adicionar ao Dock… | · | · | Dock에 추가… | · |
| macos-safari.cancel | Cancel | Cancelar | Annuler | Abbrechen | Cancelar | Annulla | キャンセル | 취소 | 取消 |

## The 30 later locales

nl, pl, sv, da, nb, fi, ru, uk, tr, cs, sk, hu, ro, hr, el, pt-PT, es-419, fr-CA, zh-Hant, zh-HK, id, ms, th, vi, hi, ca, he, ar, bg and sl. The counts above are their model-translated labels; every other label has a `chromium-xtb`, `vendor-docs` or (Chrome's one template string) `chromium-xtb-template` source. The model-translated labels, by locale (`ac` android-chrome, `cd` chrome-desktop, `ed` edge-desktop, `ic` ios-chrome, `is` ios-safari, `ss` ios-share-sheet, `mm` macos-menubar, `ms` macos-safari):

- nl: ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.add-to-favorites, ss.open-in-safari, mm.edit, ms.open-location, ms.cancel
- pl: ss.view-more, ss.view-less, ss.add-to-favorites, ss.open-in-safari, mm.edit, ms.open-location, ms.cancel
- sv: ed.apps, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.add-to-new-quick-note, ss.open-in-safari, mm.edit, mm.view, ms.open-location, ms.cancel
- da: ed.install-app, ed.cancel, ed.install, ss.view-more, ss.view-less, ss.add-to-new-quick-note, mm.edit, mm.view, ms.new-tab, ms.open-location, ms.cancel
- nb: ed.apps, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.add-to-new-quick-note, mm.edit, ms.open-location
- fi: ss.view-more, ss.view-less, ss.add-bookmark-to, ss.add-to-favorites, ss.open-in-safari, mm.edit, ms.open-location, ms.cancel
- ru: ed.install-this-site-as-an-app, is.show-reader, ss.view-more, ss.view-less, ss.add-to-home-screen, ss.add-to-favorites, ss.open-in-safari, mm.edit, ms.open-location, ms.cancel
- uk: cd.copy-link, ed.install-this-site-as-an-app, ss.view-less, mm.edit, ms.open-location, ms.cancel
- tr: ed.apps, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.open-in-safari, ms.open-location, ms.cancel
- cs: ed.apps, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.print, ss.open-in-safari, mm.edit, ms.open-location, ms.cancel
- sk: ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.add-to-new-quick-note, ss.open-in-safari, ms.open-location, ms.cancel
- hu: ed.apps, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.add-to-favorites, ss.open-in-safari, mm.edit, ms.open-location, ms.cancel
- ro: is.page-menu, is.summarise, ss.view-more, ss.view-less, ss.find-on-page, ss.page-zoom, ss.add-to-favorites, mm.edit, ms.open-location, ms.cancel
- hr: ed.settings-and-more, ed.more-tools, ed.apps, ed.install-this-site-as-an-app, is.page-menu, is.show-reader, is.summarise, ss.view-more, ss.view-less, ss.find-on-page, ss.page-zoom, ss.add-to-favorites, ss.markup, ss.print, ss.add-to-new-quick-note, ss.open-in-safari, mm.edit, mm.view, ms.new-window, ms.new-tab, ms.open-location, ms.add-to-dock-item, ms.cancel
- el: cd.copy-link, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.open-in-safari, mm.edit, ms.open-location, ms.cancel
- pt-PT: ac.install-and-create-shortcut, cd.copy-link, cd.install-app, ed.settings-and-more, ed.install-this-site-as-an-app, ed.install-app, ed.cancel, ed.install, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.print, ss.add-to-new-quick-note, ss.open-in-safari, mm.edit, ms.new-tab, ms.open-location, ms.cancel
- es-419: ed.install-this-site-as-an-app, ss.view-less, ss.add-to-favorites, ss.open-in-safari, mm.edit, ms.new-tab, ms.open-location, ms.cancel
- fr-CA: cd.find-and-edit, ed.settings-and-more, ed.more-tools, ed.apps, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.add-to-new-quick-note, ss.open-in-safari, mm.edit, ms.new-window, ms.open-location, ms.cancel
- zh-Hant: ss.view-less, ss.find-on-page, ss.add-to-new-quick-note, ss.open-in-safari, ms.open-location, ms.cancel
- zh-HK: ed.settings-and-more, ss.view-more, ss.view-less, ss.add-to-favorites, mm.edit, ms.open-location, ms.cancel
- id: cd.show-in-finder, ed.apps, is.page-menu, ss.view-more, ss.view-less, ss.find-on-page, ss.page-zoom, ss.add-to-favorites, mm.edit, ms.open-location, ms.cancel
- ms: cd.show-in-finder, ed.settings-and-more, ed.more-tools, ed.apps, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.add-to-new-quick-note, ss.open-in-safari, ms.new-tab, ms.open-location, ms.add-to-dock-item, ms.add-to-dock
- th: ac.create-shortcut, ed.more-tools, ed.apps, is.page-menu, ss.view-more, ss.view-less, ss.find-on-page, ss.page-zoom, ss.add-to-favorites, ss.print, ss.add-to-new-quick-note, ss.open-in-safari, mm.edit, ms.new-tab, ms.open-location, ms.cancel
- vi: cd.show-in-finder, ed.settings-and-more, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, mm.edit, ms.open-location, ms.cancel
- hi: cd.cancel, cd.show-in-finder, ed.settings-and-more, ed.more-tools, ed.apps, ed.install-this-site-as-an-app, ed.cancel, ic.add-to-bookmarks, ic.find-in-page, is.page-menu, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.open-in-safari, mm.edit, ms.open-location, ms.add-to-dock-item, ms.add-to-dock, ms.cancel, ms.add
- ca: ed.settings-and-more, ed.more-tools, ed.apps, ed.install-this-site-as-an-app, is.page-menu, ss.view-more, ss.view-less, ss.find-on-page, ss.page-zoom, ss.add-to-favorites, ss.print, ss.add-to-new-quick-note, ss.open-in-safari, ms.new-tab, ms.open-location, ms.add-to-dock-item, ms.add-to-dock, ms.cancel, ms.add
- he: ed.install-this-site-as-an-app, is.summarise, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.print, ss.add-to-new-quick-note, mm.edit, ms.new-window, ms.open-location, ms.cancel
- ar: ed.install-this-site-as-an-app, is.page-menu, is.summarise, ss.view-more, ss.view-less, ss.find-on-page, ss.page-zoom, ss.add-to-favorites, ss.print, ss.add-to-new-quick-note, mm.edit, mm.view, ms.new-window, ms.new-tab, ms.open-location, ms.cancel
- bg: cd.copy-link, ed.install-this-site-as-an-app, ss.view-more, ss.view-less, ss.find-on-page, ss.add-to-favorites, ss.print, ss.add-to-new-quick-note, ss.open-in-safari, mm.file, mm.edit, mm.view, ms.new-window, ms.new-tab, ms.open-location, ms.add-to-dock-item, ms.add-to-dock, ms.cancel, ms.add
- sl: ac.install-and-create-shortcut, ed.settings-and-more, ed.more-tools, ed.apps, ed.install-this-site-as-an-app, is.page-menu, is.show-reader, is.summarise, ss.share, ss.view-more, ss.view-less, ss.add-to-home-screen, ss.add-bookmark-to, ss.find-on-page, ss.add-to-reading-list, ss.page-zoom, ss.add-to-favorites, ss.markup, ss.print, ss.add-to-new-quick-note, ss.open-in-safari, mm.file, mm.edit, mm.view, ms.new-window, ms.new-tab, ms.open-location, ms.add-to-dock-item, ms.add-to-dock, ms.cancel, ms.add

Notes on how these were sourced and corrected before shipping:

- **Edge items from Microsoft help pages.** Microsoft's machine-translated pages sometimes give a sentence where the menu shows an item. `edge-desktop.install-this-site-as-an-app` was replaced in nb, hu, vi, ru, uk, cs, sk, nl, tr, el, bg, pt-PT, es-419, ar and he with the menu form (`Installer dette nettstedet som en app`, `Webhely telepítése alkalmazásként`, `Установить этот сайт как приложение`, ...). `settings-and-more` in vi and pt-PT and `more-tools` in ms were corrected the same way. Each replaced value is `model-translation` with a `note` that names the old text. No Edge string was checked against the product.
- **Strings that were English or garbled in the source:** `edge-desktop.apps` (id "Apps" -> "Aplikasi"; sv "Appar", nb "Apper"), `chrome-desktop.show-in-finder` (ms was English; id, vi and hi had translated the product name Finder), `chrome-desktop.find-and-edit` (fr-CA had a stray leading "et"), `chrome-desktop.copy-link` (el, pt-PT, bg and uk were abbreviated fragments), `ios-chrome.add-to-bookmarks` and `find-in-page` (hi), `ios-safari.show-reader` and `ios-share-sheet.add-to-home-screen` (ru quotation marks), `macos-menubar.view` (sv "Innehåll" means Contents; now "Visa").
- **Cancel.** `chrome-desktop.cancel` and `edge-desktop.cancel` in hi were "अभी नहीं" ("Not now") and are now "रद्द करें". Every other new locale's `cancel` was read and means Cancel.
- **`macos-menubar.edit` in id and ms is "Edit".** macOS in those languages shows the English word, so it is the product string. `tests/no-english.test.mjs` allow-lists it for id and ms (`SAME_LABEL` and `SHARED`), with a comment. The id value stays `model-translation` and its note says so.
- **Regional variants.** zh-Hant and zh-HK are separate sets (for example "新增標籤頁" vs "新增分頁" for New Tab in Safari). es-419 uses "Agregar", "Inicio" and "app"; fr-CA uses "appli" and "Diffuser"; pt-PT uses "ecrã", "Partilhar" and "Ficheiro" (all from the sources). The tag mappings are not confirmed by a native reviewer.
- **Key name.** "Return" (the Mac key legend) is kept in the locales whose Apple documentation uses it; ca, es-419 and fr-CA translate it. The test allow-list says which.
- **Right to left.** he and ar keep the artwork unmirrored, so "left" and "right" in the text still match the picture. Their text nodes carry `direction="rtl"` (see `markRtl` in `scripts/i18n.mjs`).
- **Still to do for every locale:** a native read of the prose, a device check of the labels, and a visual pass for the 64 labels still estimated at 100% to 130% of their slot (warnings, squeezed with `textLength`).

## Register and terminology

- es: Spain Spanish ("Añadir", "ordenadores"), tú imperative; es-419 would use "Agregar".
- fr: vous imperative ("Touchez"); "appli" in Chromium labels, "app" in prose.
- de: du imperative in descriptions, infinitive in step titles.
- pt-BR: você imperative; Title Case for Apple labels ("Ver Mais").
- it: tu imperative in steps, infinitive in titles.
- ja: です/ます; control names in 「」.
- ko: 해요체 in descriptions, noun-style step titles; Apple writes 북마크 and 윈도우.
- zh-Hans: 轻点 (iOS), 点按 (Mac), 点击 (Windows and Chrome); control names in “”.
- Word for a website placeholder (`placeholders.website`): an author translation in each locale, not a product string.
