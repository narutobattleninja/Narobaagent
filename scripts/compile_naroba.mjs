#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const root = path.resolve(import.meta.dirname, "..");
const contractPath = path.join(root, "contracts", "NarobaNFT.sol");
const source = fs.readFileSync(contractPath, "utf8");
const input = {
  language: "Solidity",
  sources: { "contracts/NarobaNFT.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    metadata: { bytecodeHash: "none" },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

function findImports(importPath) {
  const resolved = path.resolve(root, "node_modules", importPath);
  try {
    return { contents: fs.readFileSync(resolved, "utf8") };
  } catch {
    return { error: `Unable to resolve Solidity import: ${importPath}` };
  }
}

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage);
  process.exit(1);
}
for (const warning of output.errors ?? []) {
  if (warning.severity === "warning") console.warn(warning.formattedMessage);
}

const compiled = output.contracts?.["contracts/NarobaNFT.sol"]?.NarobaNFT;
if (!compiled?.evm?.bytecode?.object) throw new Error("Compiler returned no NarobaNFT creation bytecode");
const artifact = {
  contractName: "NarobaNFT",
  compilerVersion: solc.version(),
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
};
const outputPath = path.join(root, "client", "src", "contracts", "NarobaNFTArtifact.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Compiled NarobaNFT (${artifact.compilerVersion}) -> ${path.relative(root, outputPath)}`);
