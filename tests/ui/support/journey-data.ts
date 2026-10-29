/*
  Data a journey spec types into forms or sends to the API: documents with
  valid check digits (the API validates them), an NF-e the importer accepts and
  a real JPEG for the receipt photo. Different on every call, so a re-run never
  collides with the previous one's unique columns.
*/

const digits = (count: number): number[] =>
  Array.from({ length: count }, () => Math.floor(Math.random() * 10));

/** A CPF with valid check digits. */
function randomCpf(): string {
  const base = digits(9);

  const check = (numbers: number[]): number => {
    const sum = numbers.reduce(
      (total, value, index) => total + value * (numbers.length + 1 - index),
      0,
    );
    const rest = (sum * 10) % 11;

    return rest === 10 ? 0 : rest;
  };

  const first = check(base);
  const second = check([...base, first]);

  return [...base, first, second].join("");
}

/** A RENAVAM (11 digits) with a valid check digit. */
function randomRenavam(): string {
  const base = digits(10);
  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = base.reduce(
    (total, value, index) => total + value * weights[index],
    0,
  );
  const rest = (sum * 10) % 11;

  return [...base, rest === 10 ? 0 : rest].join("");
}

/** A Mercosul plate: ABC1D23. */
function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));

  return `${letter()}${letter()}${letter()}${digits(1)[0]}${letter()}${digits(2).join("")}`;
}

/**
 * An NF-e (nfeProc 4.00) with the fields the importer reads. The access key
 * is 44 digits and unique per run and index.
 */
function nfeXml({
  run,
  index,
  recipient,
}: {
  run: string;
  index: number;
  recipient: string;
}): string {
  const key =
    `3524061122233300018155001${run.padStart(9, "0").slice(-9)}${String(index).padStart(1, "0")}${digits(9).join("")}`.slice(
      0,
      44,
    );

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${key}" versao="4.00">
      <ide><nNF>${key.slice(-6)}</nNF></ide>
      <emit><CNPJ>11222333000181</CNPJ><xNome>Indústria Jornada</xNome></emit>
      <dest>
        <CNPJ>98765432000188</CNPJ>
        <xNome>${recipient}</xNome>
        <enderDest>
          <xLgr>Rua das Palmeiras</xLgr><nro>${450 + index}</nro><xBairro>Centro</xBairro>
          <xMun>São Paulo</xMun><UF>SP</UF><CEP>01001000</CEP>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod><xProd>Caixa de leite</xProd><qCom>12.0000</qCom><uCom>CX</uCom><vUnCom>4.5000</vUnCom></prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;
}

/**
 * A real 1x1 JPEG (the upload checks the bytes, not only the name), as an
 * ArrayBuffer: what `fetch` takes as a body under this repository's DOM types.
 */
function tinyJpeg(): ArrayBuffer {
  const bytes = Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64",
  );

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export { nfeXml, randomCpf, randomPlate, randomRenavam, tinyJpeg };
