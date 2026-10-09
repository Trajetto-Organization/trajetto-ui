import type { ProtectedSectionColumnsType } from "./protected-content-section-collumns.types";

const ProtectedContentSectionColumns = ({
  title,
  description,
  children,
}: ProtectedSectionColumnsType): JSX.Element => {
  // Two columns from `lg`, not `md`: the breakpoint reads the window, and at
  // 768px the sidebar leaves the page ~400px — the name field shrank to three
  // letters and the 2FA badge ran out of its card.
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-4 py-8 lg:grid-cols-10">
      <div className="col-span-4 space-y-1.5">
        <h2 className="text-lg font-semibold leading-none">{title}</h2>
        <p className="text-balance text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="col-span-6">{children}</div>
    </div>
  );
};

export { ProtectedContentSectionColumns };
