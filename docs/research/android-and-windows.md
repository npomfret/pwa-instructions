# Android and Windows installation routes

Reviewed 28 October 2026. These are documentation drafts: no Android or Windows device screenshots or version observations were supplied. The diagrams are schematic; version ranges and observed versions remain `null`. Automatic selection returns `match: "documentation"` and explains that device/version compatibility is unverified. Recorded version-specific guides take priority when available.

## Android Chrome

[Google's current Android help](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en) names the route **More → Install and create shortcut → Install**, then asks the user to complete the prompts. The guide illustrates those three controls and leaves subsequent confirmation screens to text.

[Google's developer article, last updated July 2024](https://developer.chrome.com/blog/how_chrome_helps_users_install_the_apps_they_value), describes an older **More → Add to Home screen → Install app** route. Record this as a wording variation, without inventing a release boundary. The current help supplies the illustrated wording. Creating a shortcut is a separate action and must not be presented as the same installation flow.

Home screen placement depends on the launcher; the guide does not promise automatic placement. A real device reference is still needed to verify exact menu positioning and follow-up prompts.

## Windows Chrome

[Google's desktop help](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DDesktop&hl=en) lists **More → Cast, save and share → Install page as app**. An installable site can offer a named installation action or an address-bar install icon, as described in the developer article above. The text reuses the matching Mac Chrome entry steps, but the Windows drawing has its own confirmation. It does not copy the Mac-only Next / Chrome Apps / Show in Finder sequence.

Installed apps can be managed and reopened at `chrome://apps`.

## Windows Edge

[Microsoft's current Edge help](https://support.microsoft.com/en-us/edge/install-manage-or-uninstall-apps-in-microsoft-edge) lists **Settings and more → More tools → Apps → Install this site as an app**. It also describes a direct PWA installation offer. The guide uses the documented menu route; older versions may expose Apps directly in the main menu.

Microsoft documents `edge://apps` for reopening with the app card's **Open** action. Its **Details** page offers taskbar, Start and desktop shortcuts. The guide does not assume these are all enabled automatically.
