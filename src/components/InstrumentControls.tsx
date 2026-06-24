import type { CSSProperties } from "react";
import { clampUnit } from "../data/drums";
import type { DrumDefinition, DrumSettings } from "../types";

interface InstrumentControlsProps {
  drums: DrumDefinition[];
  settings: DrumSettings;
  onParamChange: (drumId: DrumDefinition["id"], key: string, value: number) => void;
}

export function InstrumentControls({
  drums,
  settings,
  onParamChange,
}: InstrumentControlsProps) {
  return (
    <section className="instrument-board panel">
      <div className="section-heading">
        <p className="eyebrow">Voice Designer</p>
        <h2>Shape the drum kit</h2>
      </div>

      <div className="instrument-grid">
        {drums.map((drum) => (
          <article
            className="instrument-card"
            key={drum.id}
            style={{ "--drum-color": drum.color } as CSSProperties}
          >
            <header className="instrument-card__header">
              <div>
                <p className="instrument-card__badge">{drum.shortLabel}</p>
                <h3>{drum.label}</h3>
              </div>
              <p>{drum.description}</p>
            </header>

            <div className="instrument-card__sliders">
              {drum.params.map((parameter) => (
                <label className="slider-field" key={parameter.key}>
                  <div className="slider-field__copy">
                    <span>{parameter.label}</span>
                    <small>{parameter.hint}</small>
                  </div>

                  <input
                    max={1}
                    min={0}
                    onChange={(event) =>
                      onParamChange(
                        drum.id,
                        parameter.key,
                        clampUnit(Number(event.target.value)),
                      )
                    }
                    step={0.01}
                    type="range"
                    value={settings[drum.id][parameter.key]}
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
