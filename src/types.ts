export type DrumId = "kick" | "snare" | "hihat" | "tom";

export type LoopBars = number;

export type DrumParams = Record<string, number>;

export interface ParamDefinition {
  key: string;
  label: string;
  hint: string;
}

export interface DrumDefinition {
  id: DrumId;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  defaults: DrumParams;
  params: ParamDefinition[];
  barPattern: number[];
}

export type Patterns = Record<DrumId, boolean[]>;

export type DrumSettings = Record<DrumId, DrumParams>;
