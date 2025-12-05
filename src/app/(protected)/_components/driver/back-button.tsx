"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  title: string;
}

const BackButton = ({ title = "Voltar" }: BackButtonProps): JSX.Element => {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      className="mb-6 group hover:bg-accent transition-all"
      onClick={() => router.back()}
    >
      <ArrowLeft
        className="h-4 w-4 mr-2 
        transition-transform 
        group-hover:-translate-x-1"
      />
      <span className="font-medium">{title}</span>
    </Button>
  );
};

export { BackButton };
