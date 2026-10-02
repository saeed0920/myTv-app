# myTv design baseline

Existing approved direction: industrial Media Deck, matching controller.py. No visual rebrand.

- Audience: Android phone users controlling SEI610 on same Wi-Fi.
- Keep Remote / Library / Box bottom tabs; shared Container and existing deck theme tokens.
- Colors: black #080A08, panel #171B18, control #222822, line #3B443B, ink #F4F6ED, dim #A5AD9E, acid #D8FF3E, danger #FF6257; existing light theme retained.
- System fonts; bold headings, technical labels. Spacing 8/12/16/24; touch targets >=48dp.
- Library: explicit persistent upload versus temporary photo slides; upload progress/cancel; confirm delete; no silent overwrite.
- Box: proxy direct/custom/share link, Bluetooth state/actions, connection and version.
- Remote: source quality, FPS, proxy toggle, optional preview. Preview polling only focused/foreground.
- Controls: text labels plus icons, disabled/busy states, visible errors, accessibility roles/labels/live feedback. No new animation.
- Responsive: phone-first wrapping controls, safe areas, scroll overflow; tablet uses same readable layout. Preserve logical RTL layout; no new directional margins.
- Verify: typecheck, backend integration tests, Android picker/upload/cancel, temporary slides, theme/large text, foreground polling. Native screenshot/device checks require available emulator or phone.
