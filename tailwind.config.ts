import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        marquee: {
          from: {
            transform: "translateX(0)",
          },
          to: {
            transform: "translateX(calc(-100% - var(--gap)))",
          },
        },
        "marquee-vertical": {
          from: {
            transform: "translateY(0)",
          },
          to: {
            transform: "translateY(calc(-100% - var(--gap)))",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },

        // Entrance animations, replacing framer-motion's `initial` + `animate`
        // on elements that animate as soon as they mount (as opposed to on
        // scroll, which is what the `Reveal` component handles).
        //
        // Only `opacity` and `transform` are touched: both are composited by
        // the browser, so these never trigger layout or paint.
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-left": {
          from: { opacity: "0", transform: "translateX(-30px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-right": {
          from: { opacity: "0", transform: "translateX(30px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },

        // Form feedback messages. Drops in from above, overshoots a few pixels
        // and settles — the small bounce is what makes it read as a message
        // arriving rather than a block appearing. A plain fade felt inert here.
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(-16px) scale(0.96)" },
          "60%": { opacity: "1", transform: "translateY(3px) scale(1.01)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },

        // Continuous loops, replacing the framer variants that used
        // `repeat: Infinity` — floating elements, soft pulses and shimmers.
        "float-y": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        // Slides a wide gradient across the text. Unlike the others this one
        // repaints rather than compositing, but that is exactly what framer
        // was doing too — `background-position` has no cheaper equivalent.
        "gradient-slide": {
          from: { backgroundPosition: "100% 50%" },
          to: { backgroundPosition: "0% 50%" },
        },
        // Sweeps the AI "scanning" line down the preview and back. The 178px
        // is the height of the scanned area, carried over from the framer
        // variant it replaces.
        "scan-line": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(178px)" },
        },
        // Barely-there breathing, for a badge that should draw the eye without
        // becoming a distraction.
        "pulse-scale-sm": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
        // Small vertical bob, for the arrow pointing from one panel to the next.
        "bob-y": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(4px)" },
        },
        // Breathing dot next to each verification step.
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.1)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(-10deg)" },
          "40%": { transform: "rotate(10deg)" },
          "60%": { transform: "rotate(-5deg)" },
          "80%": { transform: "rotate(5deg)" },
        },
      },
      animation: {
        marquee: "marquee var(--duration) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",

        // `both` keeps the element at the `from` state before the delay
        // elapses; without it a delayed animation flashes at full opacity
        // first, which framer never did.
        "fade-in": "fade-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "fade-up 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-down": "fade-down 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-left": "fade-left 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-right": "fade-right 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "toast-in": "toast-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both",

        "float-y": "float-y 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "gradient-slide": "gradient-slide 3s linear infinite",
        "scan-line": "scan-line 2.5s ease-in-out infinite",
        "pulse-scale": "pulse-scale 2s ease-in-out infinite",
        "pulse-scale-sm": "pulse-scale-sm 2s ease-in-out infinite",
        "bob-y": "bob-y 2s ease-in-out infinite",
        wiggle: "wiggle 5s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
