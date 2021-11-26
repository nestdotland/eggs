// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Replacer = (key: string, value: unknown) => unknown;

export interface WriteJsonOptions extends Deno.WriteFileOptions {
  replacer?: Array<number | string> | Replacer;
  indent?: string;
}

function serialize(
  filePath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object: unknown,
  options: WriteJsonOptions,
): string {
  try {
    const jsonString = JSON.stringify(
      object,
      options.replacer as string[],
      options.indent,
    );
    return `${jsonString}\n`;
  } catch (err) {
    err.message = `${filePath}: ${err.message}`;
    throw err;
  }
}

/* Writes an object to a JSON file. */
export async function writeJson(
  filePath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object: unknown,
  options: WriteJsonOptions = {},
): Promise<void> {
  const jsonString = serialize(filePath, object, options);
  await Deno.writeTextFile(filePath, jsonString, {
    append: options.append,
    create: options.create,
    mode: options.mode,
  });
}

/* Writes an object to a JSON file. */
export function writeJsonSync(
  filePath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object: unknown,
  options: WriteJsonOptions = {},
): void {
  const jsonString = serialize(filePath, object, options);
  Deno.writeTextFileSync(filePath, jsonString, {
    append: options.append,
    create: options.create,
    mode: options.mode,
  });
}

/** Reads a JSON file and then parses it into an object */
export async function readJson(filePath: string): Promise<unknown> {
  const decoder = new TextDecoder("utf-8");

  const content = decoder.decode(await Deno.readFile(filePath));

  try {
    return JSON.parse(content);
  } catch (err) {
    err.message = `${filePath}: ${err.message}`;
    throw err;
  }
}

/** Reads a JSON file and then parses it into an object */
export function readJsonSync(filePath: string): unknown {
  const decoder = new TextDecoder("utf-8");

  const content = decoder.decode(Deno.readFileSync(filePath));

  try {
    return JSON.parse(content);
  } catch (err) {
    err.message = `${filePath}: ${err.message}`;
    throw err;
  }
}
