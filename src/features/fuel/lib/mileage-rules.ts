/**
 * The km rule as the fuel form and the delete confirmation state it, in the
 * API's terms (placeReading in the API's fuel-rules.ts).
 *
 * The API places every refueling by its date before it touches the vehicle:
 * with records on a later day, the km has to fit between the readings around
 * it and the vehicle stays; the newest one moves the vehicle forward. The
 * texts used to say the opposite (a back-dated refueling above the vehicle
 * was accepted and moved it), and nothing about a date-only edit, a move to
 * another vehicle or a delete giving the vehicle its km back. No directive:
 * pure, and tested.
 */
const FUEL_MILEAGE_RULES = {
  create: [
    "Informe a quilometragem do veículo no momento do abastecimento",
    "Com registros em dias posteriores à data escolhida, a quilometragem precisa ficar entre a leitura anterior e a seguinte, e o veículo não muda",
    "Sem registros em dias posteriores, a quilometragem precisa ser maior que a atual do veículo, e o veículo avança com ela",
  ],
  update: [
    "Com registros em dias posteriores, a quilometragem corrigida precisa ficar entre a leitura anterior e a seguinte",
    "No abastecimento mais recente, ela precisa superar a leitura anterior; se foi ele que definiu a quilometragem do veículo, o veículo acompanha a correção",
    "Mudar só a data segue a mesma regra, na nova data",
    "Ao mover para outro veículo, vale a regra do cadastro nele, e o veículo anterior volta à maior leitura restante se era este abastecimento que definia a quilometragem dele",
  ],
} as const satisfies Record<"create" | "update", readonly string[]>;

/** What deleting a refueling does to its vehicle's km (the API's releaseOdometer). */
const FUEL_DELETE_MILEAGE_NOTE =
  "Se era este abastecimento que definia a quilometragem atual do veículo, ela volta para a maior leitura restante.";

export { FUEL_DELETE_MILEAGE_NOTE, FUEL_MILEAGE_RULES };
