import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { lockedStepHint, viewedStepAt } from "./editor-navigation-model.js";

export default function useEditorNavigation({ steps, current, onStepSelect, disabled, focusOnMount }) {
  const rootRef = useRef(null);
  const navRef = useRef(null);
  const latest = useRef({ steps, current, onStepSelect, disabled, focusOnMount });
  latest.current = { steps, current, onStepSelect, disabled, focusOnMount };
  const [viewed, setViewed] = useState(current || steps[0]?.key);
  const [compact, setCompact] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const controller = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current, nav = navRef.current;
    if (!root || !nav) return;
    const header = document.querySelector("[data-app-header]") || document.querySelector(".MuiAppBar-root");
    let frame = 0, jumpFrame = 0, pending = null, disposed = false;
    const sections = () => [...root.querySelectorAll("[data-editor-step]")]
      .filter((element) => element.closest("[data-editor-workflow]") === root && element.getClientRects().length);
    const headerHeight = () => header?.getBoundingClientRect().bottom || 0;
    const offset = () => headerHeight() + nav.getBoundingClientRect().height + 16;
    const updateViewed = () => {
      frame = 0;
      if (pending || disposed) return;
      const entries = sections()
        .filter((element) => latest.current.steps.some((step) => step.key === element.dataset.editorStep && !step.locked))
        .map((element) => ({ key: element.dataset.editorStep, top: element.getBoundingClientRect().top }));
      const key = viewedStepAt(entries, offset(), scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2);
      if (key) setViewed((previous) => previous === key ? previous : key);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(updateViewed); };
    const measure = () => {
      setCompact(root.getBoundingClientRect().width < 760);
      root.style.setProperty("--editor-header-height", `${headerHeight()}px`);
      root.style.setProperty("--editor-navigation-height", `${nav.getBoundingClientRect().height}px`);
      schedule();
    };
    const cancelJump = (event) => {
      // MUI can activate a menu item while its keydown is still bubbling.
      // That same activation must not cancel the jump it has just requested.
      if (event && pending?.triggerEvent === event) return;
      if (pending && event?.type === "keydown" && ["Enter", " "].includes(event.key)) {
        // Some MUI versions dispatch a separate native click from keydown.
        // Match the exact destination control instead of assuming event identity.
        const control = event.target.closest?.("[aria-controls]");
        const target = sections().find((element) => element.dataset.editorStep === pending.key);
        if (target && control?.getAttribute("aria-controls") === target.id) return;
      }
      pending = null;
      cancelAnimationFrame(jumpFrame);
      schedule();
    };
    const align = () => {
      if (!pending || disposed) return;
      if (latest.current.disabled || latest.current.steps.find((step) => step.key === pending.key)?.locked) { cancelJump(); return; }
      const target = sections().find((element) => element.dataset.editorStep === pending.key);
      if (target) {
        // A closing menu may briefly block the initial focus. Once the section
        // has received focus, let a newly focused control take over immediately.
        if (pending.focused && !target.contains(document.activeElement)) { cancelJump(); return; }
        if (!pending.focused) {
          target.focus({ preventScroll: true });
          pending.focused = document.activeElement === target;
        }
        const top = Math.max(0, scrollY + target.getBoundingClientRect().top - offset());
        // Reconcile the anchor while accordion heights settle. Jumps are
        // instant (also with reduced motion) and stop on any user interaction.
        if (Math.abs(top - scrollY) > 1) window.scrollTo({ top, behavior: "instant" });
      }
      if (performance.now() < pending.until) jumpFrame = requestAnimationFrame(align);
      else { pending = null; schedule(); }
    };
    controller.current = (key, triggerEvent) => {
      const { steps: liveSteps, onStepSelect: open, disabled: blocked } = latest.current;
      const step = liveSteps.find((entry) => entry.key === key);
      if (!step || blocked) return;
      if (step.locked) { setAnnouncement(lockedStepHint(liveSteps, step)); return; }
      cancelJump();
      open?.(key);
      setViewed(key);
      setAnnouncement("");
      pending = { key, triggerEvent, focused: false, until: performance.now() + 750 };
      jumpFrame = requestAnimationFrame(align);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root); observer.observe(nav);
    if (header) observer.observe(header);
    const mutations = new MutationObserver(schedule);
    mutations.observe(root, { childList: true, subtree: true });
    measure();
    // Only explicit source-edit/back transitions opt in. Loading an ordinary
    // draft never moves the user's scroll position or focus on mount.
    if (latest.current.focusOnMount) controller.current(latest.current.focusOnMount);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    const interrupts = ["wheel", "touchstart", "pointerdown", "keydown"];
    interrupts.forEach((event) => window.addEventListener(event, cancelJump, { passive: true }));
    return () => {
      disposed = true;
      controller.current = null;
      observer.disconnect(); mutations.disconnect();
      cancelAnimationFrame(frame); cancelAnimationFrame(jumpFrame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      interrupts.forEach((event) => window.removeEventListener(event, cancelJump));
    };
  }, []);

  const select = useCallback((key, event) => controller.current?.(key, event), []);
  const currentKey = steps.some((step) => step.key === viewed) ? viewed : current || steps[0]?.key;
  return { rootRef, navRef, currentKey, compact, announcement, select };
}
