"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { NavigationItem } from "@/components/navigation/navigation-item";
import type { NavigationItem as NavigationItemConfig } from "@/config/navigation-config";

type MobileNavigationProps = Readonly<{
  navigation: readonly NavigationItemConfig[];
}>;

export function MobileNavigation({ navigation }: MobileNavigationProps) {
  const pathname = usePathname();
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [pathname]);

  function closeMenu({ restoreFocus = true } = {}) {
    setIsOpen(false);

    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  return (
    <div className="lg:hidden">
      <button
        aria-controls={dialogId}
        aria-expanded={isOpen}
        aria-label="Open navigation menu"
        className="grid size-11 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      <dialog
        aria-labelledby={`${dialogId}-title`}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-2rem))] max-w-none overflow-y-auto border-0 bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-slate-950/60"
        id={dialogId}
        onCancel={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <div className="min-h-full px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex min-h-11 items-center justify-between gap-3 px-3">
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400"
              id={`${dialogId}-title`}
            >
              Ministry navigation
            </p>
            <button
              aria-label="Close navigation menu"
              className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => closeMenu()}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <nav aria-label="Mobile navigation" className="mt-3">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <NavigationItem
                  item={item}
                  key={item.href}
                  onNavigate={() => closeMenu({ restoreFocus: false })}
                />
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </div>
  );
}
