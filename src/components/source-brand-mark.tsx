type SourceBrandMarkProps = {
  source?: string | null;
  label?: string | null;
  className?: string;
  size?: "sm" | "md";
  children?: React.ReactNode;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function normaliseLabel(
  input?: string | null,
  children?: React.ReactNode,
) {
  if (typeof input === "string" && input.trim()) return input.trim();
  if (typeof children === "string" && children.trim()) return children.trim();
  return "Source";
}

export function SourceBrandMark(props: SourceBrandMarkProps) {
  const text = normaliseLabel(props.label ?? props.source, props.children);
  const size = props.size ?? "sm";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-white/18 bg-black/28 text-white shadow-sm backdrop-blur-md",
        "whitespace-nowrap leading-none align-middle",
        size === "md"
          ? "h-10 px-4 text-sm font-semibold"
          : "h-8 px-3 text-xs font-semibold",
        props.className,
      )}
      style={{
        lineHeight: 1,
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      {text}
    </span>
  );
}

export default SourceBrandMark;