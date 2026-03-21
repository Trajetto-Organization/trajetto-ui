import Link from "next/link";
import { FaSquareWhatsapp } from "react-icons/fa6";

const WhatsApp = (): JSX.Element => {
  const phoneNumber = "5524999999999";
  const message = "Olá, pode me ajudar?";

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <Link
        href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
        aria-label="Fale com a gente no WhatsApp"
        target="_blank"
        title="Fale com a gente no WhatsApp"
        className="block"
      >
        <FaSquareWhatsapp
          size={60}
          className="text-[#25D366] hover:text-[#1da851] transition-colors"
        />
      </Link>
    </div>
  );
};

export { WhatsApp };
