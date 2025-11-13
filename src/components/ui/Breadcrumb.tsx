"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdChevronRight } from "react-icons/md";

type BreadcrumbLabel = { label: string; href?: string };
type LabelValue =
  | string
  | BreadcrumbLabel
  | ((segment: string, fullPath: string) => string | BreadcrumbLabel);

export type BreadcrumbProps = {
  /** Nhãn cho link gốc */
  homeLabel?: string;
  /** Ẩn breadcrumb ở các path này (so khớp chính xác) */
  hideOn?: string[];
  /** Map nhãn: khóa là path tuyệt đối ("/admin/products") hoặc tên segment ("products") */
  labelMap?: Record<string, LabelValue>;
  className?: string;
};

const toTitle = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const defaultLabelForSegment = (segDisplay: string) => {
  if (/^\d+$/.test(segDisplay)) return `#${segDisplay}`;   // id số -> #123
  if (/^\w{8,}$/.test(segDisplay)) return "Detail";        // id dài -> Detail
  return toTitle(segDisplay);
};

export default function Breadcrumb({
  homeLabel = "Home",
  hideOn = ["/", "/login"],
  labelMap = {},
  className = "",
}: BreadcrumbProps) {
  const pathname = usePathname();

  // Ẩn nếu path nằm trong danh sách (hỗ trợ exact match và startsWith)
  const shouldHide = hideOn.some(path => {
    if (path.endsWith('*')) {
      // Support wildcard pattern like "/messenger*"
      return pathname.startsWith(path.slice(0, -1));
    }
    if (path.includes('/') && path !== '/') {
      // For paths like "/messenger", check if pathname starts with it
      return pathname === path || pathname.startsWith(path + '/');
    }
    // Exact match for root and other paths
    return pathname === path;
  });
  
  if (shouldHide) return null;

  const parts = pathname.split("/").filter(Boolean); // raw segments
  const displayParts = parts.map((p) => decodeURIComponent(p)); // dùng cho label

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
    const segRaw = parts[i];
    const segDisplay = displayParts[i];

    // ưu tiên: map theo full path -> map theo segment -> fallback
    const rawMapped =
      pathMap[href] ?? segmentMap[segRaw] ?? defaultLabelForSegment(segDisplay);

    const mapped =
      typeof rawMapped === "function" ? rawMapped(segDisplay, href) : rawMapped;

    // chuẩn hoá về { label, hrefOverride }
    const { label, hrefOverride } =
      typeof mapped === "string"
        ? { label: mapped, hrefOverride: undefined }
        : "label" in mapped
        ? { label: mapped.label, hrefOverride: mapped.href }
        : { label: String(mapped), hrefOverride: undefined };

    return (
      <div key={href} className="flex items-center">
        {isLast ? (
          <span className="text-xs sm:text-sm font-semibold text-brand-dark truncate max-w-[120px] sm:max-w-none">{label}</span>
        ) : (
          <Link
            href={hrefOverride ?? href}
            className="text-xs sm:text-sm font-medium text-brand-primary hover:text-brand-dark transition-colors truncate max-w-[100px] sm:max-w-none"
          >
            {label}
          </Link>
        )}
        {!isLast && (
          <MdChevronRight className="text-brand-secondary mx-1 sm:mx-2 w-3 h-3 sm:w-4 sm:h-4" />
        )}
      </div>
    );
  });

  return (
     <nav
       aria-label="breadcrumb"
       className={`flex items-center mb-4 md:mb-6 ${className}`}
     >
       <Link
         href="/"
         className="text-xs sm:text-sm font-medium text-brand-primary hover:text-brand-dark transition-colors"
       >
         {homeLabel}
       </Link>
       {parts.length > 0 && (
         <MdChevronRight className="text-brand-secondary w-3 h-3 sm:w-4 sm:h-4 mx-1 sm:mx-2" />
       )}
       {items}
     </nav>
   );
}
