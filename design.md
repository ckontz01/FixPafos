# FixPafos design system

Modern-minimal civic map. The spatial map is the main app surface, with a compact report index on the left on desktop and a map above the board on mobile. A services directory lives in the same panel. Moderation uses the same typography and surfaces.

Theme: warm ivory paper, white surfaces, navy actions, dark navy text with a restrained terracotta brand accent. Preserve Geist body and Space Grotesk display. All colours and typography use named CSS variables. Shared styles live in src/app/design.css, layered after the existing base styles. Use a four-point spacing scale and rounded rectangular controls. Headings remain upright; motion is limited to short control transitions with reduced-motion support.

Header: wordmark, map and services navigation, an experimental Report with AI link, and the standard report action. Footer: prominent navy Insights and Moderation buttons with icons and generous tap targets, plus independent-platform identification. No decorative hero or fabricated statistics. Counts come from public reports. Department logos identify the responsible authority and never imply a partnership or automatic submission to that authority.

Experimental chat: a separate `/report/chat` route keeps the map surface focused. Use the same typography, warm surfaces and navy actions. A five-step progress indicator follows description, optional photo, confirmed location, public name and final review. Label the assistant experimental and the description an editable AI draft. Show Open camera, Record voice, Use GPS and Choose on map controls at the relevant step. Permission errors must show a typing, upload or map alternative. Keep playback/transcript review, photo preview and pin confirmation visible before advancing; publishing requires an explicit Submit report action. Explain that the chat needs a connection and unfinished work is lost on reload, while the standard form retains its offline queue.

Logo assets retain their original aspect ratio and colour. Municipality services use the official Pafos Municipality seal; water and sewerage use the official EOA Pafos logo. Category pictograms are interface symbols, not official departmental logos.

Mobile: verify 320, 375, 414 and 768 pixel widths. Keep controls readable, actions on one line, no horizontal page overflow, and map attribution visible. Cards may wrap their content. Desktop panels scroll independently while the map stays visible.

The FixPafos product logo is the team-supplied AI-generated image, displayed unaltered with its original aspect ratio. It is distinct from official authority marks.
