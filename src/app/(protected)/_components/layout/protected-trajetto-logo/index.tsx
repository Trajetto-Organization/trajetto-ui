import Image from "next/image";

const ProtectedTrajettoLogo = ({
  className,
}: {
  className?: string;
}): JSX.Element => (
  <Image
    src="/trajetto-logo.png"
    alt="Trajetto"
    width={120}
    height={32}
    className={`h-7 w-auto ${className || ""}`}
  />
);

export { ProtectedTrajettoLogo };
