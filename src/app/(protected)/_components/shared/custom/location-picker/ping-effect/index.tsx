import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

// Component for the ping animation and marker
const PingEffect = (): JSX.Element => {
  return (
    <div className="relative w-0 h-0">
      {/* Animated ping circle */}
      <motion.div
        className="absolute rounded-full bg-[#d81b60]/30"
        style={{ width: 30, height: 30, top: -15, left: -15 }}
        animate={{
          scale: [0.5, 1.5],
          opacity: [0.7, 0],
        }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          repeatDelay: 0.3,
          ease: "easeOut",
        }}
      />

      {/* White base dot */}
      <motion.div
        className="absolute rounded-full bg-white shadow-md"
        style={{ width: 14, height: 14, top: -7, left: -7 }}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 10 }}
      />

      {/* Pin icon - perfectly centered */}
      <motion.div
        initial={{ y: -5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="absolute"
        style={{ top: -24, left: -12 }}
      >
        <MapPin className="h-6 w-6 text-[#d81b60]" strokeWidth={2.5} />
      </motion.div>
    </div>
  );
};

export { PingEffect };
