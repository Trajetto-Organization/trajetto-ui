async function parseNDJSON(
  response: Response,
): Promise<{ meta: any; data: any[] }> {
  if (!response.body) {
    throw new Error("ReadableStream não suportado.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  let meta: any = null;

  const data: any[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");

    // The last line may be incomplete, so it is kept in the buffer
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);

        // Checks if it is the metadata object
        if (json.meta) {
          meta = json.meta;
        } else {
          data.push(json);
        }
      } catch (err) {
        console.error("Erro ao parsear linha:", err, line);
      }
    }
  }

  // Processes any remaining content in the buffer
  if (buffer.trim()) {
    try {
      const json = JSON.parse(buffer);

      if (json.meta) {
        meta = json.meta;
      } else {
        data.push(json);
      }
    } catch (err) {
      console.error("Erro ao parsear buffer final:", err, buffer);
    }
  }

  return { meta, data };
}

export { parseNDJSON };
