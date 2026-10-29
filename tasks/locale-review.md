# Locale review worklist

Eight draft locales are in (es, fr, de, pt-BR, it, ja, ko, zh-Hans). None is complete. Source: the data in `labels/` and `guides/*/*/*/layout-1/locales/`, generated after integration. Every `_src` has `deviceChecked: false`: no label has been checked on a device. The design and the checks are in [docs/api.md](../docs/api.md#localization) and [docs/authoring-guides.md](../docs/authoring-guides.md).

## Open decisions

1. The final first-wave locale list, agreed with wl-bill-splitter, including whether `nl` or `pl` fills the ninth slot.
2. Who translates, who reviews the prose as a native speaker, and who checks the labels on devices.
3. Whether right-to-left locales (`ar`, `he`) are in scope; their mockups would need mirroring.
4. Who does the per-locale visual review of the artwork before a locale is marked complete. The overflow check is an estimate.

Labels counted below are the 61 browser and OS labels in `labels/*.json` other than `ui` and `document` (all eight locales have all 24 `ui` and 3 `document` strings, unsourced by design).

## Missing in every locale

| Surface | Id | English |
| --- | --- | --- |
| ios-share-sheet | view-less | View Less |
| macos-menubar | edit | Edit |
| macos-safari | open-location | Open Location… |
| macos-safari | cancel | Cancel |

## Counts

| Locale | Sourced | Missing |
| --- | ---: | ---: |
| es | 42 | 19 |
| fr | 45 | 16 |
| de | 54 | 7 |
| pt-BR | 46 | 15 |
| it | 50 | 11 |
| ja | 48 | 13 |
| ko | 45 | 16 |
| zh-Hans | 53 | 8 |

## Labels that need more room in the artwork

Sourced labels past the 130% overflow limit (rule 7). They warn while the locale is a draft and fail once it is complete. The label text is exact, so the artwork must give them more room before the locale ships:

| Locale | Label | Text | Width used |
| --- | --- | --- | ---: |
| es | macos-menubar.view | Visualización | 141% of 60 (macos-safari artwork) |
| es | chrome-desktop.open-tab-in-app | Abrir pestaña en la aplicación | 149% of 150 (macos-chrome artwork) |
| fr | chrome-desktop.open-tab-in-app | Ouvrir l'onglet dans l'appli | 131% of 150 (macos-chrome artwork) |

## Prose limits (all locales)

- `{label:id}` resolves in `intro`, `completion` and step text. It does not resolve in `alt`, `svgTitle` or `svgDesc` (the build copies those as written), so control names there are plain text, as in the English. Each locale below lists the names it matched.
- Control names in `intro` and `completion` that have no label (for example the Edge completion text "Open", "Details", "Pin to taskbar", "Pin to Start", "Create desktop shortcut"; the Android intro "Add to Home screen") are plain text in every locale.
- Where a step names a control whose label is missing for the locale, the step uses `{label:id}` anyway (rule 3 warnings). Those steps break at runtime until the label is added.
- The macOS Safari intro says "Share menu" in the English; the macOS menu has no label for it, so it is plain text in every locale.

## Spanish (es)

Missing labels (also missing everywhere: 4, see top): 15

| Surface | Id | English |
| --- | --- | --- |
| ios-safari | page-menu | Page Menu |
| ios-safari | show-reader | Show Reader |
| ios-safari | summarise | Summarise |
| ios-share-sheet | share | Share |
| ios-share-sheet | view-more | View More |
| ios-share-sheet | find-on-page | Find on Page |
| ios-share-sheet | page-zoom | Page Zoom |
| ios-share-sheet | add-to-favorites | Add to Favorites |
| ios-share-sheet | markup | Markup |
| ios-share-sheet | print | Print |
| ios-share-sheet | add-to-new-quick-note | Add to New Quick Note |
| ios-share-sheet | open-in-safari | Open in Safari |
| macos-safari | new-window | New Window |
| macos-safari | new-tab | New Tab |
| macos-safari | add-to-dock-item | Add to Dock… |

Sourced with doubts: 8

| Surface.id | Value | Doubt |
| --- | --- | --- |
| chrome-desktop.print | Imprimir... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.save-page-as | Guardar página como... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.install-website | Instalar Sitio web… | template-derived: Chromium template with the placeholders.website word filled in |
| edge-desktop.install-app | Instalar aplicación | Chromium string, not read from Edge |
| edge-desktop.cancel | Cancelar | Chromium string, not read from Edge |
| edge-desktop.install | Instalar | Chromium string, not read from Edge |
| ios-share-sheet.add-bookmark-to | Añadir marcador a | no ellipsis (English has "…") |
| placeholders.website | Sitio web | author-translation (own word, not a product string) |

Control names written as plain text (unverified, cannot use placeholders):

- ios-safari-iphone alt: Añadir a pantalla de inicio
- ios-safari-iphone svgTitle: Añadir a pantalla de inicio
- ios-safari-iphone svgDesc: Añadir a pantalla de inicio
- ios-chrome-iphone alt: Añadir a pantalla de inicio
- macos-safari-desktop alt: Añadir al Dock, Archivo, Añadir
- macos-safari-desktop svgTitle: Añadir
- macos-safari-desktop svgDesc: Añadir al Dock, Archivo, Añadir
- macos-chrome-desktop alt: Enviar, guardar y compartir, Mostrar en Finder, Siguiente, Instalar, Más
- macos-chrome-desktop svgTitle: Instalar
- macos-chrome-desktop svgDesc: Enviar, guardar y compartir, Mostrar en Finder, Siguiente, Instalar, Más
- android-chrome-android svgTitle: Instalar
- android-chrome-android svgDesc: Instalar y crear acceso directo, Instalar, Más
- windows-chrome-desktop svgTitle: Instalar
- windows-edge-desktop svgTitle: Instalar
- Matches are substrings of known labels, so ordinary verbs ("Install", "Add") can appear; names with no label in this locale are not detected. Read `alt`, `svgTitle` and `svgDesc` for both.

Register and terminology to confirm:

- Variety: prose and Apple strings read as Spain Spanish (Añadir, "para ordenadores"); confirm es-ES versus es-419, which would use "Agregar".
- Register: tú imperative in steps; guide titles are infinitives ("Añadir a pantalla de inicio").
- "app" in prose, "aplicación" in Chromium labels ("Instalar aplicación").
- Placeholder word for a site name: "Sitio web".

## French (fr)

Missing labels (also missing everywhere: 4, see top): 12

| Surface | Id | English |
| --- | --- | --- |
| edge-desktop | install-app | Install app |
| edge-desktop | cancel | Cancel |
| edge-desktop | install | Install |
| ios-share-sheet | view-more | View More |
| ios-share-sheet | find-on-page | Find on Page |
| ios-share-sheet | add-to-favorites | Add to Favorites |
| ios-share-sheet | print | Print |
| ios-share-sheet | add-to-new-quick-note | Add to New Quick Note |
| ios-share-sheet | open-in-safari | Open in Safari |
| macos-menubar | view | View |
| macos-safari | new-window | New Window |
| macos-safari | new-tab | New Tab |

Sourced with doubts: 7

| Surface.id | Value | Doubt |
| --- | --- | --- |
| android-chrome.install-and-create-shortcut | Installer et créer un raccourci | help page, not the Chromium string file |
| chrome-desktop.print | Imprimer... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.install-website | Installer Site web… | template-derived: Chromium template with the placeholders.website word filled in |
| ios-chrome.create-a-qr-code | Créer un QR code | Source has a no-break space between "QR" and "code"; copied exactly. |
| ios-share-sheet.add-bookmark-to | Ajouter un signet à | no ellipsis (English has "…") |
| macos-safari.add-to-dock-item | Ajouter au Dock | no ellipsis (English has "…") |
| placeholders.website | Site web | author-translation (own word, not a product string) |

Control names written as plain text (unverified, cannot use placeholders):

- ios-safari-iphone alt: Sur l’écran d’accueil, Partager
- ios-brave-iphone alt: Partager
- ios-chrome-iphone alt: Sur l’écran d’accueil, Partager
- macos-safari-desktop alt: Ajouter au Dock, Ajouter, Fichier
- macos-safari-desktop svgTitle: Ajouter
- macos-chrome-desktop alt: Caster, enregistrer et partager, Afficher dans le Finder, Installer, Suivant, Plus
- macos-chrome-desktop svgTitle: Installer
- android-chrome-android svgTitle: Installer
- windows-chrome-desktop svgTitle: Installer
- Matches are substrings of known labels, so ordinary verbs ("Install", "Add") can appear; names with no label in this locale are not detected. Read `alt`, `svgTitle` and `svgDesc` for both.

Register and terminology to confirm:

- Register: vous imperative ("Touchez", "Ouvrez"); confirm "Touchez" over "Appuyez".
- "app" in prose, "l'appli" and "Applications" in Chromium labels.
- Placeholder word for a site name: "Site web" (also "Caster" from Chromium for Cast).

## German (de)

Missing labels (also missing everywhere: 4, see top): 3

| Surface | Id | English |
| --- | --- | --- |
| ios-share-sheet | view-more | View More |
| ios-share-sheet | add-to-favorites | Add to Favorites |
| ios-share-sheet | open-in-safari | Open in Safari |

Sourced with doubts: 21

| Surface.id | Value | Doubt |
| --- | --- | --- |
| android-chrome.install-and-create-shortcut | Installieren und Verknüpfung erstellen | help page, not the Chromium string file |
| android-chrome.install | Installieren | help page, not the Chromium string file |
| android-chrome.create-shortcut | Verknüpfung erstellen | help page, not the Chromium string file |
| chrome-desktop.print | Drucken... | ends with "..." (Chromium/Apple source), English has "…"; Message is the context-menu one, assumed identical to the app menu item. Text copied exactly: Chromium ends it with three full stops "...", while the English label uses the single charact... |
| chrome-desktop.cast-save-and-share | Streamen, speichern und teilen | English source is "Cast, save, and share"; matches the German help page |
| chrome-desktop.save-page-as | Seite speichern unter... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.install-website | Website installieren… | template-derived: Chromium template with the placeholders.website word filled in |
| chrome-desktop.chrome-apps | Chrome-Apps | template fragment: the label is the first part of a longer Chromium message |
| edge-desktop.install-this-site-as-an-app | Diese Website als App installieren | machine-translated vendor page; Third-party German support article quoting the Edge menu item; Microsoft's own German page is machine translated ("Installieren Sie diese Website als App"). Verify on a device. |
| edge-desktop.install-app | App installieren | Chromium string, not read from Edge; Chromium string; Edge's install dialog is Chromium-based but not confirmed in Edge. |
| edge-desktop.cancel | Abbrechen | Chromium string, not read from Edge; Generic Chromium Cancel; not confirmed in Edge. |
| edge-desktop.install | Installieren | Chromium string, not read from Edge; Chromium string; not confirmed in Edge. |
| ios-chrome.add-to-bookmarks | Zu Lesezeichen hinzufügen | English source is "Add to Bookmarks". |
| ios-chrome.create-a-qr-code | QR‑Code erstellen | Contains U+2011 non-breaking hyphen exactly as in the xtb. |
| ios-safari.summarise | Zusammenfassen | English source is "Summarise" (Apple Intelligence). |
| ios-share-sheet.add-bookmark-to | Lesezeichen hinzufügen zu … | space before "…"; Apple writes a space before the ellipsis. |
| ios-share-sheet.find-on-page | Auf Seite suchen | Older Apple guide wording ("Share > Auf Seite suchen"); also at guide/iphone/iph6297b394b/15.0/ios/15.0. Not re-confirmed for iOS 27. |
| ios-share-sheet.print | Drucken | Notes share menu item; assumed identical in the Safari share sheet. |
| ios-share-sheet.add-to-new-quick-note | Zu Schnellnotiz hinzufügen | Apple's German wording differs from the English mockup label "Add to New Quick Note"; this is the documented German action name. |
| macos-safari.add-to-dock-item | Zum Dock hinzufügen | no ellipsis (English has "…") |
| placeholders.website | Website | author-translation (own word, not a product string) |

Control names written as plain text (unverified, cannot use placeholders):

- ios-safari-iphone alt: Zu Home-Bildschirm hinzufügen, Seitenmenü, Teilen
- ios-safari-iphone svgTitle: Zu Home-Bildschirm hinzufügen
- ios-safari-iphone svgDesc: Zu Home-Bildschirm hinzufügen, Seitenmenü, Teilen
- ios-brave-iphone alt: Teilen
- ios-chrome-iphone alt: Zu Home-Bildschirm hinzufügen, Teilen
- macos-safari-desktop alt: Zum Dock hinzufügen, Hinzufügen, Ablage
- macos-safari-desktop svgTitle: Website
- macos-safari-desktop svgDesc: Zum Dock hinzufügen, Hinzufügen, Ablage
- macos-chrome-desktop alt: Streamen, speichern und teilen, Im Finder anzeigen, Installieren, Weiter, Mehr
- macos-chrome-desktop svgDesc: Streamen, speichern und teilen, Im Finder anzeigen, Installieren, Weiter, Mehr
- android-chrome-android svgDesc: Installieren und Verknüpfung erstellen, Installieren, Mehr
- Matches are substrings of known labels, so ordinary verbs ("Install", "Add") can appear; names with no label in this locale are not detected. Read `alt`, `svgTitle` and `svgDesc` for both.

Register and terminology to confirm:

- Register: du imperative in descriptions, infinitive in step titles ("Auf Teilen tippen"); confirm the mix is intended.
- Placeholder word for a site name: "Website"; Chrome label "Desktopwebsite anfordern" uses the same word.
- "Taste" versus "Schaltfläche" for buttons.

## Brazilian Portuguese (pt-BR)

Missing labels (also missing everywhere: 4, see top): 11

| Surface | Id | English |
| --- | --- | --- |
| edge-desktop | install-app | Install app |
| edge-desktop | cancel | Cancel |
| edge-desktop | install | Install |
| ios-share-sheet | view-more | View More |
| ios-share-sheet | find-on-page | Find on Page |
| ios-share-sheet | add-to-favorites | Add to Favorites |
| ios-share-sheet | print | Print |
| ios-share-sheet | add-to-new-quick-note | Add to New Quick Note |
| ios-share-sheet | open-in-safari | Open in Safari |
| macos-safari | new-tab | New Tab |
| macos-safari | add-to-dock-item | Add to Dock… |

Sourced with doubts: 11

| Surface.id | Value | Doubt |
| --- | --- | --- |
| android-chrome.more | Mais | help page, not the Chromium string file |
| android-chrome.install-and-create-shortcut | Instalar e criar atalho | help page, not the Chromium string file |
| android-chrome.install | Instalar | help page, not the Chromium string file |
| android-chrome.create-shortcut | Criar atalho | IDS_APP_HOME_CREATE_SHORTCUT (desktop app home); not confirmed as the Android menu string |
| chrome-desktop.more | Mais | help page, not the Chromium string file |
| chrome-desktop.print | Imprimir... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.cast-save-and-share | Transmitir, salvar e compartilhar | Also quoted in Chromium English is "Cast, save, and share" (Oxford comma); repo English omits the comma. |
| chrome-desktop.install-website | Instalar Site… | template-derived: Chromium template with the placeholders.website word filled in |
| chrome-desktop.chrome-apps | Apps do Chrome | template fragment: the label is the first part of a longer Chromium message |
| ios-share-sheet.add-bookmark-to | Adicionar Favorito a | no ellipsis (English has "…"); Apple quotes it without the trailing ellipsis the English label has |
| placeholders.website | Site | author-translation (own word, not a product string) |

Control names written as plain text (unverified, cannot use placeholders):

- ios-safari-iphone alt: Adicionar à Tela de Início, Menu da Página, Compartilhar
- ios-safari-iphone svgTitle: Adicionar à Tela de Início
- ios-safari-iphone svgDesc: Adicionar à Tela de Início, Menu da Página, Compartilhar
- ios-brave-iphone alt: Compartilhar
- ios-chrome-iphone alt: Adicionar à Tela de Início, Compartilhar
- macos-safari-desktop alt: Adicionar ao Dock, Adicionar, Arquivo
- macos-safari-desktop svgTitle: Adicionar
- macos-safari-desktop svgDesc: Adicionar ao Dock, Adicionar, Arquivo
- macos-chrome-desktop alt: Transmitir, salvar e compartilhar, Mostrar no Finder, Instalar, Avançar, Mais
- macos-chrome-desktop svgTitle: Instalar
- macos-chrome-desktop svgDesc: Transmitir, salvar e compartilhar, Mostrar no Finder, Instalar, Avançar, Mais
- android-chrome-android svgTitle: Instalar
- android-chrome-android svgDesc: Instalar e criar atalho, Instalar, Mais
- windows-chrome-desktop svgTitle: Instalar
- Matches are substrings of known labels, so ordinary verbs ("Install", "Add") can appear; names with no label in this locale are not detected. Read `alt`, `svgTitle` and `svgDesc` for both.

Register and terminology to confirm:

- Register: você imperative ("toque", "abra"); guide titles are infinitives ("Adicionar à Tela de Início").
- "planilha de compartilhamento" for the share sheet; confirm against Apple pt-BR.
- "app" in prose, "aplicativo" in Edge labels, "Site" as the site-name placeholder.

## Italian (it)

Missing labels (also missing everywhere: 4, see top): 7

| Surface | Id | English |
| --- | --- | --- |
| ios-share-sheet | view-more | View More |
| ios-share-sheet | find-on-page | Find on Page |
| ios-share-sheet | add-to-favorites | Add to Favorites |
| ios-share-sheet | print | Print |
| ios-share-sheet | add-to-new-quick-note | Add to New Quick Note |
| ios-share-sheet | open-in-safari | Open in Safari |
| macos-safari | new-tab | New Tab |

Sourced with doubts: 13

| Surface.id | Value | Doubt |
| --- | --- | --- |
| chrome-desktop.print | Stampa... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.save-page-as | Salva pagina come... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.install-website | Installa Sito web… | template-derived: Chromium template with the placeholders.website word filled in |
| edge-desktop.apps | Applicazioni | This article writes Applicazioni; other Microsoft Italian pages write App for the same submenu. |
| edge-desktop.install-app | Installa app | Chromium string, not read from Edge |
| edge-desktop.cancel | Annulla | Chromium string, not read from Edge |
| edge-desktop.install | Installa | Chromium string, not read from Edge |
| ios-safari.page-menu | menu Pagina | Apple writes it in running text as "menu Pagina" ("il pulsante del menu Pagina"). |
| ios-safari.show-reader | Mostra modalità Lettura | Apple Italian names Reader "modalità Lettura". |
| ios-share-sheet.add-bookmark-to | Aggiungi segnalibro a | no ellipsis (English has "…"); Apple quotes it without the trailing "…" that the English label has; text copied exactly from the source. |
| ios-share-sheet.markup | Modifica | Apple Italian steps: Condividi, then "Tocca Modifica" to annotate the page (English: Markup). Verify against the device. |
| macos-safari.add-to-dock-item | Aggiungi al Dock | no ellipsis (English has "…"); Apple quotes it without the trailing "…" that the English label has; text copied exactly from the source. |
| placeholders.website | Sito web | author-translation (own word, not a product string) |

Control names written as plain text (unverified, cannot use placeholders):

- ios-safari-iphone alt: Aggiungi alla schermata Home, menu Pagina, Condividi
- ios-safari-iphone svgDesc: Aggiungi alla schermata Home, menu Pagina, Condividi
- ios-brave-iphone alt: Condividi
- ios-chrome-iphone alt: Aggiungi alla schermata Home, Condividi
- macos-safari-desktop alt: Aggiungi al Dock, Aggiungi, File
- macos-safari-desktop svgDesc: Aggiungi al Dock, Aggiungi, File
- macos-chrome-desktop alt: Trasmetti, salva e condividi, Mostra nel Finder, Installa, Avanti, Altro
- macos-chrome-desktop svgTitle: Installa
- macos-chrome-desktop svgDesc: Trasmetti, salva e condividi, Mostra nel Finder, Installa, Avanti, Altro
- android-chrome-android svgTitle: Installa
- android-chrome-android svgDesc: Installa e crea scorciatoia, Installa, Altro
- windows-chrome-desktop svgTitle: Installa
- windows-edge-desktop svgTitle: Installa
- Matches are substrings of known labels, so ordinary verbs ("Install", "Add") can appear; names with no label in this locale are not detected. Read `alt`, `svgTitle` and `svgDesc` for both.

Register and terminology to confirm:

- Register: tu imperative in steps, but guide titles are infinitives ("Aggiungere alla schermata Home") while Apple's label is the imperative "Aggiungi alla schermata Home".
- "menu Pagina" and "modalità Lettura" follow Apple running text, not a button label.
- Edge: "App" versus "Applicazioni" for the Apps submenu (sources disagree).
- Placeholder word for a site name: "Sito web".

## Japanese (ja)

Missing labels (also missing everywhere: 4, see top): 9

| Surface | Id | English |
| --- | --- | --- |
| android-chrome | create-shortcut | Create shortcut |
| ios-safari | page-menu | Page Menu |
| ios-share-sheet | view-more | View More |
| ios-share-sheet | find-on-page | Find on Page |
| ios-share-sheet | page-zoom | Page Zoom |
| ios-share-sheet | add-to-favorites | Add to Favorites |
| ios-share-sheet | print | Print |
| ios-share-sheet | add-to-new-quick-note | Add to New Quick Note |
| macos-safari | new-tab | New Tab |

Sourced with doubts: 14

| Surface.id | Value | Doubt |
| --- | --- | --- |
| android-chrome.more | その他 | help page, not the Chromium string file |
| android-chrome.install-and-create-shortcut | インストールしてショートカットを作成 | help page, not the Chromium string file |
| android-chrome.install | インストール | help page, not the Chromium string file |
| chrome-desktop.more | その他 | help page, not the Chromium string file |
| chrome-desktop.print | 印刷... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.save-page-as | 名前を付けてページを保存... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.install-website | ウェブサイト をインストール... | template-derived: Chromium template with the placeholders.website word filled in; ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.create-shortcut | ショートカットを作成... | ends with "..." (Chromium/Apple source), English has "…" |
| edge-desktop.install-app | アプリのインストール | Chromium string, not read from Edge |
| edge-desktop.cancel | キャンセル | Chromium string, not read from Edge |
| edge-desktop.install | インストール | Chromium string, not read from Edge |
| ios-share-sheet.add-bookmark-to | ブックマークの追加先 | no ellipsis (English has "…") |
| macos-safari.add-to-dock-item | Dockに追加 | no ellipsis (English has "…") |
| placeholders.website | ウェブサイト | author-translation (own word, not a product string) |

Control names written as plain text (unverified, cannot use placeholders):

- ios-safari-iphone alt: ホーム画面に追加
- ios-safari-iphone svgTitle: ホーム画面に追加
- ios-safari-iphone svgDesc: ホーム画面に追加
- ios-brave-iphone alt: Safariで開く
- ios-chrome-iphone alt: ホーム画面に追加
- macos-safari-desktop alt: Dockに追加, ファイル
- macos-safari-desktop svgTitle: Dockに追加, ウェブサイト
- macos-safari-desktop svgDesc: Dockに追加, ファイル
- macos-chrome-desktop alt: キャスト、保存、共有, Finder で表示, インストール, その他
- macos-chrome-desktop svgTitle: インストール
- macos-chrome-desktop svgDesc: キャスト、保存、共有, Finder で表示, インストール, その他
- android-chrome-android alt: インストール
- android-chrome-android svgTitle: インストール
- android-chrome-android svgDesc: インストールしてショートカットを作成, インストール, その他
- windows-chrome-desktop alt: インストール
- windows-chrome-desktop svgTitle: インストール
- windows-edge-desktop alt: インストール
- windows-edge-desktop svgTitle: インストール, アプリ
- Matches are substrings of known labels, so ordinary verbs ("Install", "Add") can appear; names with no label in this locale are not detected. Read `alt`, `svgTitle` and `svgDesc` for both.

Register and terminology to confirm:

- Register: です/ます in descriptions; step titles use 「」 around control names.
- Word for website: "ウェブサイト" (Chromium template gives "ウェブサイト をインストール" with a space) versus "サイト" in Edge labels.
- Chromium ja uses "..." in print, save and install labels; Apple and Microsoft strings are written without spaces.

## Korean (ko)

Missing labels (also missing everywhere: 4, see top): 12

| Surface | Id | English |
| --- | --- | --- |
| edge-desktop | apps | Apps |
| edge-desktop | install-this-site-as-an-app | Install this site as an app |
| ios-share-sheet | view-more | View More |
| ios-share-sheet | add-bookmark-to | Add Bookmark to… |
| ios-share-sheet | find-on-page | Find on Page |
| ios-share-sheet | add-to-favorites | Add to Favorites |
| ios-share-sheet | print | Print |
| ios-share-sheet | add-to-new-quick-note | Add to New Quick Note |
| ios-share-sheet | open-in-safari | Open in Safari |
| macos-safari | new-window | New Window |
| macos-safari | new-tab | New Tab |
| macos-safari | add-to-dock-item | Add to Dock… |

Sourced with doubts: 10

| Surface.id | Value | Doubt |
| --- | --- | --- |
| android-chrome.more | 더보기 | help page, not the Chromium string file |
| chrome-desktop.more | 더보기 | help page, not the Chromium string file |
| chrome-desktop.print | 인쇄 | no ellipsis (English has "…") |
| chrome-desktop.save-page-as | 페이지를 다른 이름으로 저장... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.install-website | 웹사이트 설치… | template-derived: Chromium template with the placeholders.website word filled in |
| chrome-desktop.create-shortcut | 바로가기 만들기... | ends with "..." (Chromium/Apple source), English has "…" |
| edge-desktop.install-app | 앱 설치 | Chromium string, not read from Edge |
| edge-desktop.cancel | 취소 | Chromium string, not read from Edge |
| edge-desktop.install | 설치 | Chromium string, not read from Edge |
| placeholders.website | 웹사이트 | author-translation (own word, not a product string) |

Control names written as plain text (unverified, cannot use placeholders):

- ios-safari-iphone alt: 홈 화면에 추가, 페이지 메뉴
- ios-safari-iphone svgTitle: 홈 화면에 추가
- ios-safari-iphone svgDesc: 홈 화면에 추가, 페이지 메뉴
- ios-chrome-iphone alt: 홈 화면에 추가
- macos-safari-desktop alt: Dock에 추가
- macos-safari-desktop svgTitle: Dock에 추가, 웹사이트
- macos-safari-desktop svgDesc: Dock에 추가
- macos-chrome-desktop alt: Finder에서 보기, 더보기
- macos-chrome-desktop svgTitle: 앱 설치
- macos-chrome-desktop svgDesc: Finder에서 보기, 더보기
- android-chrome-android svgDesc: 설치 및 바로가기 만들기, 더보기
- windows-chrome-desktop svgTitle: 앱 설치
- windows-edge-desktop svgTitle: 앱 설치
- Matches are substrings of known labels, so ordinary verbs ("Install", "Add") can appear; names with no label in this locale are not detected. Read `alt`, `svgTitle` and `svgDesc` for both.

Register and terminology to confirm:

- Register: 해요체 in descriptions ("탭하세요"), noun-style in step titles ("탭하기").
- Placeholder word for a site name: "웹사이트".
- Mixed Latin and Hangul product names ("Dock에 추가", "Finder에서 보기").

## Simplified Chinese (zh-Hans)

Missing labels (also missing everywhere: 4, see top): 4

| Surface | Id | English |
| --- | --- | --- |
| ios-safari | summarise | Summarise |
| ios-share-sheet | find-on-page | Find on Page |
| ios-share-sheet | add-to-new-quick-note | Add to New Quick Note |
| ios-share-sheet | open-in-safari | Open in Safari |

Sourced with doubts: 22

| Surface.id | Value | Doubt |
| --- | --- | --- |
| android-chrome.more | 更多 | help page, not the Chromium string file |
| android-chrome.install-and-create-shortcut | 安装并创建快捷方式 | help page, not the Chromium string file |
| android-chrome.install | 安装 | help page, not the Chromium string file |
| android-chrome.create-shortcut | 创建快捷方式 | help page, not the Chromium string file |
| chrome-desktop.more | 更多 | help page, not the Chromium string file |
| chrome-desktop.print | 打印... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.cast-save-and-share | 投放、保存和分享 | IDS_CAST_SAVE_AND_SHARE_MENU; English there is "Cast, save, and share". |
| chrome-desktop.save-page-as | 网页另存为... | ends with "..." (Chromium/Apple source), English has "…" |
| chrome-desktop.install-website | 安装“网站”… | template-derived: Chromium template with the placeholders.website word filled in |
| chrome-desktop.chrome-apps | Chrome 应用 | template fragment: the label is the first part of a longer Chromium message |
| edge-desktop.settings-and-more | 设置及更多 | Another Microsoft zh-cn page writes 设置和更多; this page is the cleaner quote. |
| edge-desktop.apps | 应用程序 | machine-translated vendor page; Microsoft warns that this page is machine-translated; the Edge UI may say 应用. |
| edge-desktop.install-this-site-as-an-app | 将此站点安装为应用 | machine-translated vendor page; Machine-translated page; the UI wording may differ slightly. |
| edge-desktop.install-app | 安装应用 | Chromium string, not read from Edge; Chromium string IDS_INSTALL_PWA_DIALOG_TITLE; Edge shares the Chromium install dialog but this was not read from Edge itself. |
| edge-desktop.cancel | 取消 | Chromium string, not read from Edge; Chromium string; not read from Edge itself. |
| edge-desktop.install | 安装 | Chromium string, not read from Edge; Chromium string IDS_INSTALL_PWA_BUTTON_LABEL; not read from Edge itself. |
| ios-chrome.add-to-bookmarks | 添加到书签 | IDS_IOS_TOOLS_MENU_ADD_TO_BOOKMARKS; English there is "Add to Bookmarks". |
| ios-chrome.create-a-qr-code | 生成二维码 | IDS_IOS_SHARE_MENU_GENERATE_QR_CODE_ACTION; English there is "Create a QR Code". |
| ios-chrome.request-desktop-site | 请求切换到桌面版网站 | IDS_IOS_SHARE_MENU_REQUEST_DESKTOP_SITE; English there is "Request Desktop Site". |
| ios-share-sheet.add-bookmark-to | 将书签添加至 | no ellipsis (English has "…"); Apple quotes it without the trailing "…" that the English label has; text copied exactly from the source. |
| macos-safari.add-to-dock-item | 添加到程序坞 | no ellipsis (English has "…"); Apple quotes it without the trailing "…" that the English label has; text copied exactly from the source. |
| placeholders.website | 网站 | author-translation (own word, not a product string) |

Control names written as plain text (unverified, cannot use placeholders):

- ios-safari-iphone alt: 添加到主屏幕, 页面菜单, 查看更多
- ios-safari-iphone svgTitle: 添加到主屏幕
- ios-safari-iphone svgDesc: 添加到主屏幕, 页面菜单, 查看更多
- ios-brave-iphone alt: 查看更多
- ios-chrome-iphone alt: 添加到主屏幕, 查看更多
- macos-safari-desktop alt: 添加到程序坞
- macos-safari-desktop svgTitle: 添加到程序坞
- macos-safari-desktop svgDesc: 添加到程序坞
- macos-chrome-desktop alt: 在 Finder 中显示, 投放、保存和分享, 下一步
- macos-chrome-desktop svgTitle: 安装应用
- macos-chrome-desktop svgDesc: 在 Finder 中显示, 投放、保存和分享, 下一步
- android-chrome-android svgDesc: 安装并创建快捷方式
- windows-chrome-desktop svgTitle: 安装应用
- windows-edge-desktop svgTitle: 安装应用
- Matches are substrings of known labels, so ordinary verbs ("Install", "Add") can appear; names with no label in this locale are not detected. Read `alt`, `svgTitle` and `svgDesc` for both.

Register and terminology to confirm:

- Verb by platform: 轻点 (iOS), 点按 (Mac steps), 点击 (Windows/Edge); confirm this is intended.
- Share: Apple label "共享", Chromium Cast label "分享"; confirm they should differ.
- "Safari 浏览器" in prose versus "Safari" in labels; quote marks “” around control names.
- Edge: Microsoft pages are machine-translated, so "应用" versus "应用程序" and "设置及更多" versus "设置和更多" are unresolved.
