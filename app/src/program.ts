import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "./idl/stateshift.json";

export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl as any, provider);
}
