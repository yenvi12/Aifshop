"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdChevronRight } from "react-icons/md";

type LabelValue = string | ((segment: string, fullPath: string) => string);

export type BreadcrumbProps = {
  /** Nhãn cho link gốc */
  homeLabel?: string;
  /** Ẩn breadcrumb ở các path này (so khớp prefix) */
  hideOn?: string[];
  /** Map nhãn: khóa là path tuyệt đối ("/admin/products") hoặc tên segment ("products") */
  labelMap?: Record<string, LabelValue>;
  className?: string;
};

const toTitle = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const defaultLabelForSegment = (seg: string) => {
  if (/^\d+$/.test(seg)) return `#${seg}`;           // id số -> #123
  if (/^\w{8,}$/.test(seg)) return "Detail";         // id dài -> Detail
  return toTitle(seg);
};

export default function Breadcrumb({
  homeLabel = "Home",
  hideOn = ["/", "/login"],
  labelMap = {},
  className = "",
}: BreadcrumbProps) {
  const pathname = usePathname();

  // Ẩn nếu path khớp danh sách
  if (hideOn.some((p) => pathname === p || pathname.startsWith(p + "?"))) {
    return null;
  }

  const parts = pathname.split("/").filter(Boolean);

  // chuẩn bị map theo segment (khóa không bắt đầu bằng '/')
  const segmentMap: Record<string, LabelValue> = {};
  const pathMap: Record<string, LabelValue> = {};
  for (const [k, v] of Object.entries(labelMap)) {
    if (k.startsWith("/")) pathMap[k] = v;
    else segmentMap[k] = v;
  }

  const items = parts.map((_, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const isLast = i === parts.length - 1;
    const seg = parts[i];

    // ưu tiên: map theo full path -> map theo segment -> fallback
    const mapped =
      pathMap[href] ??
      segmentMap[seg] ??
      defaultLabelForSegment(seg);

    const label = typeof mapped === "function" ? mapped(seg, href) : mapped;

    return (
      <div key={href} className="flex items-center">
        {isLast ? (
          <span className="text-sm font-semibold text-brand-dark">{label}</span>
        ) : (
          <Link
            href={href}
            className="text-sm font-medium text-brand-primary hover:text-brand-dark transition-colors"
          >
            {label}
          </Link>
        )}
        {!isLast && (
          <MdChevronRight className="text-brand-secondary mx-2 w-4 h-4" />
        )}
      </div>
    );
  });

  return (
    <nav
      aria-label="breadcrumb"
      className={`flex items-center mb-6 ${className}`}
    >
      <Link
        href="/"
        className="text-sm font-medium text-brand-primary hover:text-brand-dark transition-colors"
      >
        {homeLabel}
      </Link>
      {parts.length > 0 && (
        <MdChevronRight className="text-brand-secondary w-4 h-4 mx-2" />
      )}
      {items}
    </nav>
  );
}
