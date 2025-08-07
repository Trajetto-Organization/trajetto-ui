const Stats = (): JSX.Element => {
  const stats = [
    { value: "99.9%", label: "Tempo de atividade" },
    { value: "24/7", label: "Monitoramento" },
    { value: "15min", label: "Tempo de resposta" },
    { value: "500+", label: "Clientes satisfeitos" },
  ];

  return (
    <section className="py-16 bg-card border-y">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-4xl font-bold mb-2 bg-clip-text text-transparent 
                bg-gradient-to-r from-primary to-primary/70"
              >
                {stat.value}
              </div>
              <div className="text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Stats };
