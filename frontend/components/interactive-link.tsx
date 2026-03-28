"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type AnchorHTMLAttributes, type ReactNode, useEffect, useState } from "react";

type InteractiveLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: ReactNode;
    pendingClassName?: string;
  };

export function InteractiveLink({
  href,
  children,
  className,
  pendingClassName,
  onClick,
  onMouseEnter,
  prefetch = true,
  ...rest
}: InteractiveLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  const hrefString = typeof href === "string" ? href : href.pathname?.toString();

  return (
    <Link
      href={href}
      prefetch={prefetch}
      {...rest}
      className={[className, pending ? pendingClassName : ""].filter(Boolean).join(" ")}
      data-pending={pending ? "true" : undefined}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (hrefString) {
          void router.prefetch(hrefString);
        }
      }}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          !rest.target
        ) {
          setPending(true);
        }
      }}
    >
      {children}
    </Link>
  );
}
