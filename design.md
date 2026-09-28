# FixPafos design system

Modern-minimal civic map. The spatial map is the main app surface, with a compact report index on the left on desktop and a map above the board on mobile. A services directory lives in the same panel. Moderation uses the same typography and surfaces.

Theme: warm ivory paper, white surfaces, navy actions, dark navy text with a restrained terracotta brand accent. Preserve Geist body and Space Grotesk display. All colours and typography use named CSS variables. Shared styles live in src/app/design.css, layered after the existing base styles. Use a four-point spacing scale and rounded rectangular controls. Headings remain upright; motion is limited to short control transitions with reduced-motion support.

Header: wordmark, two functional navigation items, one report action. Footer: compact links and independent-platform identification. No decorative hero or fabricated statistics. Counts come from public reports. Department logos identify the responsible authority and never imply a partnership or automatic submission to that authority.

Logo assets retain their original aspect ratio and colour. Municipality services use the official Pafos Municipality seal; water and sewerage use the official EOA Pafos logo. Category pictograms are interface symbols, not official departmental logos.

Mobile: verify 320, 375, 414 and 768 pixel widths. Keep controls readable, actions on one line, no horizontal page overflow, and map attribution visible. Cards may wrap their content. Desktop panels scroll independently while the map stays visible.

The FixPafos product logo is the team-supplied AI-generated image, displayed unaltered with its original aspect ratio. It is distinct from official authority marks.
