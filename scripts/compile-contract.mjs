import fs from "node:fs";
import solc from "solc";

const source = fs.readFileSync("contracts/AgentTrustMarketplace.sol", "utf8");
const input = { language: "Solidity", sources: { "AgentTrustMarketplace.sol": { content: source } }, settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((item) => item.severity === "error") || [];
if (errors.length) { console.error(errors.map((item) => item.formattedMessage).join("\n")); process.exit(1); }
const contract = output.contracts["AgentTrustMarketplace.sol"].AgentTrustMarketplace;
console.log(JSON.stringify({ abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` }, null, 2));
