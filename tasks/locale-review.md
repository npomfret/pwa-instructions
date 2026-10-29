# Locale sourcing

The eight locales (es, fr, de, pt-BR, it, ja, ko, zh-Hans) are complete translations and ship in the package. This file records how each label was sourced, so a label can be spot-checked on a device later. The design and the checks are in [docs/api.md](../docs/api.md#localization) and [docs/authoring-guides.md](../docs/authoring-guides.md).

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
