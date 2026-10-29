import type { ReactNode } from "react";

import { Plus } from "lucide-react";

/**
 * The inside of every page's create button: "+" then the words.
 *
 * Entregas had the icon, the other modules did not, so the same gesture
 * looked different page to page. The icon is decorative (the words are the
 * name); the spacing comes from the Button's own gap, and the words truncate
 * instead of pushing the row wider on a narrow phone.
 */
const CreateButtonLabel = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => (
  <>
    <Plus aria-hidden="true" data-create-icon className="h-4 w-4 shrink-0" />
    <span className="truncate">{children}</span>
  </>
);

export { CreateButtonLabel };
