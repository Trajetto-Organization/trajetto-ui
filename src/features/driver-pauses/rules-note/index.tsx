/**
 * How the report counts, said on the screen (decision 6.1). The alerts are
 * only as good as their inputs, and a manager who reads "direção" must know it
 * is route time minus pauses, not a tachograph. No hooks: rendered by the
 * server component.
 */
interface PauseRulesNoteProps {
  timeZone?: string;
}

const PauseRulesNote = ({ timeZone }: PauseRulesNoteProps): JSX.Element => (
  <details
    className="rounded-md border p-4 text-sm text-muted-foreground"
    data-tutorial="pauses-rules"
  >
    <summary className="cursor-pointer font-medium text-foreground">
      Como a jornada e os alertas são calculados
    </summary>

    <div className="mt-3 space-y-2">
      <p>
        Os alertas seguem a Lei 13.103/2015 e só sinalizam: nada é bloqueado
        para o motorista. O relatório não substitui o registro oficial de
        jornada (diário de bordo, papeleta ou ponto).
      </p>

      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Jornada:</strong> do primeiro início de rota ou de pausa ao
          último fim, contada no dia em que começou
          {timeZone ? ` (fuso da empresa: ${timeZone})` : " (fuso da empresa)"}.
          Uma pausa feita durante uma rota pertence à jornada dessa rota, então
          uma rota que passa da meia-noite é uma jornada só. Uma pausa fora de
          rota vai com a rota mais próxima (a que terminou antes ou a que começa
          depois) quando ela está a menos de 11 horas: um descanso logo depois
          de uma rota noturna fica na jornada dessa noite. Uma rota esquecida em
          andamento continua contando até ser concluída.
        </li>
        <li>
          <strong>Direção estimada:</strong> tempo de rota em andamento menos as
          pausas. Inclui o tempo parado nos clientes; o trabalho fora de uma
          rota (carregar no pátio, por exemplo) não aparece.
        </li>
        <li>
          <strong>Refeição:</strong> jornada acima de 6 horas pede intervalo de
          no mínimo 1 hora (CLT, art. 71 e art. 235-C, § 2º). Compara o maior
          intervalo contínuo de refeição (registros que se sobrepõem contam uma
          vez) e só é avaliada quando a jornada termina.
        </li>
        <li>
          <strong>Descanso na direção:</strong> 30 minutos a cada 6 horas de
          direção, podendo ser divididos (CTB, art. 67-C, § 1º). Contam as
          pausas registradas de qualquer tipo; intervalo entre rotas sem pausa
          registrada não conta como descanso.
        </li>
        <li>
          <strong>Interjornada:</strong> 11 horas seguidas entre o fim de uma
          jornada e o início da próxima (CLT, art. 235-C, § 3º).
        </li>
        <li>
          <strong>Pausa não encerrada:</strong> aberta há mais de 12 horas; a
          duração dela fica fora dos cálculos.
        </li>
        <li>
          <strong>Pausa acima de 12 horas:</strong> encerrada só depois de 12
          horas, o que indica que ficou aberta por esquecimento. A duração
          registrada aparece na linha, mas fica fora dos cálculos (descanso,
          direção e fim da jornada), para não esconder a refeição do dia nem
          encurtar o descanso da noite.
        </li>
      </ul>
    </div>
  </details>
);

export { PauseRulesNote };
