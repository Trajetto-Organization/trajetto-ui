import { MapPin } from "lucide-react";

// Component for the ping animation and marker
const PingEffect = (): JSX.Element => {
  return (
    <div className="relative w-0 h-0">
      {/* Animated ping circle. Tailwind's own `animate-ping` is the same
          effect — scale out while fading — so there is no custom keyframe
          for it. The framer version added a 0.3s pause between pulses; the
          built-in one loops continuously, which reads the same on a map pin. */}
      <div
        className="animate-ping absolute rounded-full bg-[#d81b60]/30"
        style={{ width: 30, height: 30, top: -15, left: -15 }}
      />

      {/* White base dot */}
      <div
        className="animate-scale-in absolute rounded-full bg-white shadow-md"
        style={{ width: 14, height: 14, top: -7, left: -7 }}
      />

      {/* Pin icon - perfectly centered */}
      <div
        className="animate-fade-down [animation-delay:100ms] absolute"
        style={{ top: -24, left: -12 }}
      >
        <MapPin className="h-6 w-6 text-[#d81b60]" strokeWidth={2.5} />
      </div>
    </div>
  );
};

export { PingEffect };
