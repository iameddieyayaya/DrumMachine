const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seq-tests-"));
const filesToTranspile = [
  "src/types.ts",
  "src/data/drums.ts",
  "src/lib/sequencerState.ts",
];

for (const relativeFile of filesToTranspile) {
  const absoluteFile = path.resolve(process.cwd(), relativeFile);
  const source = fs.readFileSync(absoluteFile, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: absoluteFile,
  });

  const outputFile = path.join(
    tempDir,
    relativeFile.replace(/\.ts$/, ".js"),
  );
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, transpiled.outputText, "utf8");
}

const drums = require(path.join(tempDir, "src/data/drums.js"));
const sequencer = require(path.join(tempDir, "src/lib/sequencerState.js"));

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("loop bars clamp to supported range", () => {
  const initial = sequencer.createInitialSequencerState();
  const next = sequencer.sequencerReducer(initial, {
    type: "setLoopBars",
    loopBars: 24,
  });

  assert.equal(next.loopBars, 16);
  assert.equal(next.patterns.kick.length, drums.totalSteps(16));
});

test("step velocity is clamped inside reducer", () => {
  const initial = sequencer.createInitialSequencerState();
  const next = sequencer.sequencerReducer(initial, {
    type: "setStepVelocity",
    drumId: "kick",
    step: 0,
    velocity: 3,
  });

  assert.equal(next.patterns.kick[0], 1);
});

test("copy and paste track restores track content", () => {
  let state = sequencer.createInitialSequencerState();
  state = sequencer.sequencerReducer(state, {
    type: "selectTrack",
    drumId: "snare",
  });
  state = sequencer.sequencerReducer(state, { type: "copyTrack" });
  const copied = [...state.patterns.snare];

  state = sequencer.sequencerReducer(state, {
    type: "applyTrackOperation",
    operation: "clearTrack",
  });
  assert.ok(state.patterns.snare.every((value) => value === 0));

  state = sequencer.sequencerReducer(state, { type: "pasteTrack" });
  assert.deepEqual(state.patterns.snare, copied);
});

test("fill every 4 adds repeating hits on selected track", () => {
  let state = sequencer.createInitialSequencerState();
  state = sequencer.sequencerReducer(state, { type: "clearPatterns" });
  state = sequencer.sequencerReducer(state, {
    type: "selectTrack",
    drumId: "hihat",
  });
  state = sequencer.sequencerReducer(state, {
    type: "applyTrackOperation",
    operation: "fill4",
  });

  assert.equal(state.patterns.hihat[0] > 0, true);
  assert.equal(state.patterns.hihat[4] > 0, true);
  assert.equal(state.patterns.hihat[1], 0);
});

test("house preset builds an expected backbone rhythm", () => {
  let state = sequencer.createInitialSequencerState();
  state = sequencer.sequencerReducer(state, {
    type: "applyPreset",
    presetId: "house",
  });

  assert.equal(state.patterns.kick[0] > 0, true);
  assert.equal(state.patterns.kick[4] > 0, true);
  assert.equal(state.patterns.snare[2] > 0, true);
  assert.equal(state.patterns.snare[6] > 0, true);
});

test("random patterns stay within velocity bounds", () => {
  const patterns = drums.createRandomPatterns(8);
  for (const track of Object.values(patterns)) {
    for (const velocity of track) {
      assert.ok(velocity >= 0 && velocity <= 1);
    }
  }
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`\n${tests.length} tests passed.`);
}
