import { ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

interface FormErrorProps {
  message?: string;
}

const ErrorForm = ({ message }: FormErrorProps): JSX.Element | null => {
  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: "tween" }}
      className="bg-red-100 p-3 rounded-md 
      flex items-center gap-x-2 text-sm 
      text-destructive mt-5"
    >
      <ShieldAlert className="w-5 h-5 flex-shrink-0" />
      <p className="break-words ml-1">{message}</p>
    </motion.div>
  );
};

export { ErrorForm };
