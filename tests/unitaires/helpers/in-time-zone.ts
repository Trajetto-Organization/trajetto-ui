import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Runs `body` in a fresh Node process whose clock is in `timeZone`.
 *
 * Vitest runs each test file in a worker thread, and a worker cannot change
 * its zone: its `process.env` is a private copy, so assigning `TZ` there
 * resets neither the Date cache nor ICU. A suite that "pins" the zone that
 * way passes only on machines already in that zone. A child process started
 * with `TZ` in its environment really is in that zone, on every OS.
 *
 * `modules` maps a variable name to a source file, imported before `body`
 * runs. `body` is plain JavaScript, the body of an async function; it sees
 * each module under its name and returns something JSON can carry. The
 * sources go through Node's own type stripping, so they must be free of path
 * aliases and non-erasable TypeScript, as the date helpers are.
 *
 * Asynchronous so several zones can run side by side: loading date-fns
 * alone takes about a second per process.
 */
async function inTimeZone<T>(
  timeZone: string,
  modules: Record<string, string>,
  body: string,
): Promise<T> {
  const imports = Object.entries(modules)
    .map(
      ([name, file]) =>
        `const ${name} = await import(${JSON.stringify(pathToFileURL(file).href)});`,
    )
    .join("\n");

  const script = `${imports}
const result = await (async () => {${body}})();
process.stdout.write(JSON.stringify(result));`;

  // Type stripping is on by default from Node 22.18; before that (22.6+) it
  // needs the flag.
  const stripsTypes = Boolean(
    (process.features as { typescript?: unknown }).typescript,
  );

  try {
    const { stdout } = await run(
      process.execPath,
      [
        ...(stripsTypes ? [] : ["--experimental-strip-types"]),
        "--no-warnings",
        "--input-type=module",
        "--eval",
        script,
      ],
      {
        env: { ...process.env, TZ: timeZone },
        encoding: "utf8",
      },
    );

    return JSON.parse(stdout) as T;
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? "";

    throw new Error(`O processo em ${timeZone} falhou:\n${stderr || error}`);
  }
}

export { inTimeZone };
