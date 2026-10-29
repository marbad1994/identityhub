import { Fingerprint } from "lucide-react";
import { WIDGET_ICONS, type WidgetBrand, type WidgetIcon } from "@/lib/widget-brand";

export function WidgetIconGraphic({ icon }: { icon: WidgetIcon }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={WIDGET_ICONS.find((item) => item.id === icon)?.path} />
    </svg>
  );
}

export function WidgetMark({
  brand = { kind: "initials" },
  appName,
}: {
  brand?: WidgetBrand;
  appName: string;
}) {
  if (brand.kind === "none") return null;
  return (
    <div className={`ih-monogram ${brand.kind === "logo" ? "ih-logo" : ""}`} aria-hidden="true">
      {brand.kind === "logo" ? (
        <img src={brand.dataUrl} alt="" width="54" height="54" />
      ) : brand.kind === "icon" ? (
        <WidgetIconGraphic icon={brand.icon} />
      ) : appName === "IdentityHub" ? (
        <Fingerprint />
      ) : (
        `${Array.from(appName.trim())[0]?.toLowerCase() || "a"}.`
      )}
    </div>
  );
}
