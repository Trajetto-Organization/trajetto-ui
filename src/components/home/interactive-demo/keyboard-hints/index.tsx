const KeyboardHints = (): JSX.Element => {
  return (
    <div
      className="animate-fade-up [animation-delay:1s]
      absolute bottom-4 right-4 z-[200]
      bg-black/80 text-white px-3 py-2
      rounded-lg text-xs backdrop-blur-sm"
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <kbd
            className="bg-white/20 px-1.5 
            py-0.5 rounded text-xs"
          >
            ←
          </kbd>
          <kbd
            className="bg-white/20 px-1.5 
            py-0.5 rounded text-xs"
          >
            →
          </kbd>
          Navegar
        </span>
        <span className="flex items-center gap-1">
          <kbd
            className="bg-white/20 px-2 
            py-0.5 rounded text-xs"
          >
            Espaço
          </kbd>
          Play/Pause
        </span>
      </div>
    </div>
  );
};

export { KeyboardHints };
