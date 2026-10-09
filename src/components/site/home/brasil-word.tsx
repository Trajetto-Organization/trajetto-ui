/**
 * "Brasil" in a moving green and yellow gradient, as in the design. The
 * colours are the flag's, the same in both themes; the text stays real.
 */
const BrasilWord = (): JSX.Element => (
  <span className="animate-tp-grad bg-[linear-gradient(90deg,#009739,#d4b800,#009739,#d4b800,#009739)] bg-[length:200%_100%] bg-clip-text font-semibold text-transparent">
    Brasil
  </span>
);

export { BrasilWord };
