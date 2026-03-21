"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Mail, CheckCircle } from "lucide-react";

const NewsletterSection = (): JSX.Element => {
  const [email, setEmail] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSubmitted(true);

    setEmail("");

    // Reset success message after 5 seconds
    setTimeout(() => {
      setIsSubmitted(false);
    }, 5000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="bg-gradient-to-r from-[#f5f3ff] 
      to-[#ecfdf5] rounded-2xl p-8 md:p-12 
      relative overflow-hidden"
    >
      {/* Background decoration */}
      <div
        className="absolute inset-0 bg-gradient-to-br 
        from-purple-400/10 via-transparent to-green-400/10"
      />

      <div className="max-w-2xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-16 h-16 
          bg-white rounded-full shadow-lg mb-6"
        >
          <Mail className="w-8 h-8 text-[#7c3aed]" />
        </motion.div>

        <h2
          className="text-2xl md:text-3xl 
          font-bold text-gray-900 mb-4"
        >
          Fique Atualizado
        </h2>

        <p className="text-gray-600 mb-8">
          Inscreva-se em nossa newsletter para receber as últimas insights sobre
          gestão de frotas e inovações do setor.
        </p>

        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-3 
            text-green-600 font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Inscrição realizada com sucesso!</span>
          </motion.div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row 
            gap-4 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 
              focus:outline-none focus:ring-2 focus:ring-[#7c3aed] 
              focus:border-transparent transition-all"
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#7c3aed] text-white px-8 py-3 
              rounded-xl hover:bg-[#6d28d9] transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-white/30 
                  border-t-white rounded-full animate-spin"
                  />
                  Inscrevendo...
                </span>
              ) : (
                "Inscrever-se"
              )}
            </Button>
          </form>
        )}

        <p className="text-xs text-gray-500 mt-4">
          Ao se inscrever, você concorda com nossa política de privacidade.
          Cancele a qualquer momento.
        </p>
      </div>
    </motion.div>
  );
};

export { NewsletterSection };
