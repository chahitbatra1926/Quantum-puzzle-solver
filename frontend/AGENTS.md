<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Keep shareable frontend sections in individual TanStack file routes within the shared command-center shell, so navigation and page metadata remain consistent.
- Keep solver algorithms in a browser-safe domain module and execute race generation in a native Web Worker, so search cannot block animations.
- Track earned progress in a session-scoped React context for this frontend-only design; do not imply server accounts or cross-device persistence.
- Define visual tokens, cinematic motion, and responsive presentation in the central stylesheet; controls use the shared Button primitive for accessible interactions.
- Keep queens mounted in a row-keyed overlay and animate their transforms; schedule playback with requestAnimationFrame so pieces glide instead of remounting every search frame.
