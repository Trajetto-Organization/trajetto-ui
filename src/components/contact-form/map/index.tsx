import { Eyebrow, SectionHeading } from "@/components/site/primitives";
import { Reveal } from "@/components/site/reveal";
import { DARK_BAND } from "@/components/site/institutional/dark-band";
import { cn } from "@/lib/utils";

import styles from "./coverage-map.module.css";

/**
 * "Onde atendemos" on /contact (design: Contato · Onde atendemos): a dark
 * band with the facts on one side and the state capitals linked to the
 * centre of Brazil on the other.
 *
 * It replaced a Leaflet map whose only job was to show that centre: the
 * Leaflet bundle and CSS plus a dozen OpenStreetMap tile requests per
 * visitor, each sending the visitor's IP to a server in the United Kingdom.
 * This is drawn on the server from coordinates, with no JavaScript of its
 * own and no third-party request. The operation is digital: there is no
 * office to point at, so the picture says reach, not an address.
 *
 * The site Reveal around the drawing marks it `data-site-reveal="shown"`
 * when it scrolls in; the CSS module plays the motion once from there (rings
 * open, links and capitals light up from the centre outwards) and then
 * leaves the drawing still. Server HTML, no-JS and reduced motion get the
 * final drawing.
 */

interface Place {
  lat: number;
  lon: number;
}

/** Bounding box of the territory, in degrees, with a small margin. */
const BOUNDS = { west: -74.5, east: -34, north: 5.8, south: -34.2 };

/** Pixels per degree. Near the equator, degrees of lat/lon are close enough. */
const SCALE = 10;

const WIDTH = (BOUNDS.east - BOUNDS.west) * SCALE;
const HEIGHT = (BOUNDS.north - BOUNDS.south) * SCALE;

/** Approximate geographic centre of Brazil. */
const CENTRE: Place = { lat: -14.235, lon: -51.925 };

/** The state capitals (and the Federal District). */
const CAPITALS: Place[] = [
  { lat: 2.82, lon: -60.673 }, // Boa Vista
  { lat: 0.035, lon: -51.07 }, // Macapá
  { lat: -1.455, lon: -48.49 }, // Belém
  { lat: -3.119, lon: -60.021 }, // Manaus
  { lat: -2.53, lon: -44.302 }, // São Luís
  { lat: -3.717, lon: -38.543 }, // Fortaleza
  { lat: -5.089, lon: -42.802 }, // Teresina
  { lat: -5.794, lon: -35.211 }, // Natal
  { lat: -7.115, lon: -34.863 }, // João Pessoa
  { lat: -8.047, lon: -34.877 }, // Recife
  { lat: -9.666, lon: -35.735 }, // Maceió
  { lat: -10.947, lon: -37.073 }, // Aracaju
  { lat: -12.971, lon: -38.501 }, // Salvador
  { lat: -8.761, lon: -63.9 }, // Porto Velho
  { lat: -9.975, lon: -67.81 }, // Rio Branco
  { lat: -10.184, lon: -48.333 }, // Palmas
  { lat: -15.601, lon: -56.097 }, // Cuiabá
  { lat: -15.794, lon: -47.882 }, // Brasília
  { lat: -16.686, lon: -49.264 }, // Goiânia
  { lat: -20.469, lon: -54.62 }, // Campo Grande
  { lat: -19.917, lon: -43.934 }, // Belo Horizonte
  { lat: -20.315, lon: -40.312 }, // Vitória
  { lat: -22.907, lon: -43.173 }, // Rio de Janeiro
  { lat: -23.551, lon: -46.633 }, // São Paulo
  { lat: -25.429, lon: -49.271 }, // Curitiba
  { lat: -27.595, lon: -48.548 }, // Florianópolis
  { lat: -30.035, lon: -51.218 }, // Porto Alegre
];

function project({ lat, lon }: Place): { x: number; y: number } {
  return {
    x: Math.round((lon - BOUNDS.west) * SCALE * 10) / 10,
    y: Math.round((BOUNDS.north - lat) * SCALE * 10) / 10,
  };
}

const TITLE_ID = "contact-coverage-title";

const CONTACT_INFORMATION = [
  { title: "Atendimento", content: "100% digital, sem instalação local" },
  { title: "Cobertura", content: "Todo o território nacional" },
  { title: "Horário", content: "Seg-Sex: 09:00 - 18:00" },
];

const VIOLET = "#9b7dff";
const PINK = "#f0558e";

const Map = (): JSX.Element => {
  const centre = project(CENTRE);
  const cities = CAPITALS.map(project).map((city) => ({
    ...city,
    // Light-up order: nearest capitals first, as the design's sweep.
    delay: `${Math.round(200 + Math.hypot(city.x - centre.x, city.y - centre.y) * 4)}ms`,
  }));

  return (
    <section
      aria-labelledby="cobertura-titulo"
      className="px-[clamp(20px,4vw,40px)] pb-[clamp(72px,10vw,120px)] pt-[clamp(40px,6vw,72px)]"
    >
      <div
        className={cn(
          "relative mx-auto max-w-[1200px] overflow-hidden rounded-[clamp(24px,3vw,36px)] bg-[#0b0b10]",
          DARK_BAND.ink,
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_60%_at_75%_50%,rgba(155,125,255,.16),transparent_70%),radial-gradient(30%_40%_at_85%_85%,rgba(240,85,142,.12),transparent_70%)]"
        />
        <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-center gap-6 p-[clamp(32px,5vw,64px)]">
          <Reveal className="flex flex-col gap-[22px]">
            <Eyebrow tone="dark-band">ONDE ATENDEMOS</Eyebrow>
            <SectionHeading
              id="cobertura-titulo"
              className="text-[clamp(34px,4.2vw,56px)] leading-[1.02]"
            >
              De qualquer capital ao interior.
            </SectionHeading>
            <p
              className={cn(
                "m-0 max-w-[440px] text-[17px] leading-[1.6]",
                DARK_BAND.body,
              )}
            >
              Operação 100% digital, para frotas e entregas em todo o Brasil.
            </p>
            <dl className="m-0 mt-3 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[18px] border-t border-white/10 pt-6">
              {CONTACT_INFORMATION.map(({ title, content }) => (
                <div key={title}>
                  <dt className="text-sm font-semibold">{title}</dt>
                  <dd className={cn("m-0 mt-1 text-[13.5px]", DARK_BAND.body)}>
                    {content}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal variant="fade" className="relative flex justify-center">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-labelledby={TITLE_ID}
              className="block h-auto w-full max-w-[500px] select-none overflow-visible"
            >
              <title id={TITLE_ID}>
                Ilustração: o atendimento do Trajetto é digital e chega a frotas
                e operações de entrega em todo o Brasil, com as capitais ligadas
                ao centro do país.
              </title>

              {/* Range rings around the centre: reach, not distance. */}
              {[70, 140, 210].map((radius, index) => (
                <circle
                  key={`ring-${radius}`}
                  className={styles.ring}
                  cx={centre.x}
                  cy={centre.y}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,.16)"
                  strokeWidth={1}
                  strokeDasharray="1 5"
                  style={{
                    transformOrigin: `${centre.x}px ${centre.y}px`,
                    animationDelay: `${index * 150}ms`,
                  }}
                />
              ))}

              {cities.map((city, index) => (
                <line
                  key={`link-${index}`}
                  className={styles.link}
                  x1={centre.x}
                  y1={centre.y}
                  x2={city.x}
                  y2={city.y}
                  stroke="rgba(255,255,255,.22)"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeDasharray="2 6"
                  style={{ animationDelay: city.delay }}
                />
              ))}

              {cities.map((city, index) => (
                <circle
                  key={`city-${index}`}
                  className={styles.city}
                  cx={city.x}
                  cy={city.y}
                  r={4}
                  fill={index % 3 === 0 ? VIOLET : PINK}
                  style={{ animationDelay: city.delay }}
                />
              ))}

              <circle
                className={styles.ping}
                cx={centre.x}
                cy={centre.y}
                r={9}
                fill={PINK}
              />
              <circle
                cx={centre.x}
                cy={centre.y}
                r={9}
                fill={PINK}
                stroke="#0b0b10"
                strokeWidth={3}
              />
              <text
                x={centre.x}
                y={centre.y - 18}
                textAnchor="middle"
                fontSize={15}
                fontWeight={700}
                fill="#f3f3f6"
              >
                Trajetto
              </text>
            </svg>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export { Map };
