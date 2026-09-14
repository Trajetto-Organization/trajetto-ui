import Image from "next/image";
import trajettoLogo from "@/assets/logo/trajetto-logo.png";

const ProtectedTrajettoLogo = ({
  className,
}: {
  className?: string;
}): JSX.Element => (
  <Image
    src={trajettoLogo}
    alt="Trajetto"
    width={120}
    height={32}
    className={`h-7 w-auto ${className || ""}`}
    placeholder="blur"
  />
);

export { ProtectedTrajettoLogo };
