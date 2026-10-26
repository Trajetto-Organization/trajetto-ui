import { LogoMark } from "@/components/shared/logo-mark";

/** The sidebar's brand tile mark (22x11); the word sits next to it. */
const ProtectedTrajettoLogo = ({
  className,
}: {
  className?: string;
}): JSX.Element => <LogoMark width={22} priority className={className} />;

export { ProtectedTrajettoLogo };
