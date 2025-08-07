import { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProtectedPageContainerProps {
  children: ReactNode;
  scrollable?: boolean;
}

const ProtectedPageContainer = ({
  children,
  scrollable,
}: ProtectedPageContainerProps): JSX.Element => {
  return (
    <>
      {scrollable ? (
        <ScrollArea className="h-[calc(100dvh-52px)]">
          <div className="h-full p-4 md:px-8">{children}</div>
        </ScrollArea>
      ) : (
        <div className="h-full p-4 md:px-8">{children}</div>
      )}
    </>
  );
};

export default ProtectedPageContainer;
