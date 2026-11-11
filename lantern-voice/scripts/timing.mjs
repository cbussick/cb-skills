const tailSeconds = 0.2;

export function validateSteps(trace) {
  const names = new Set();
  if (!trace.steps.length) throw new Error('Scene needs named steps with captions.');
  if (trace.steps[0].t0 !== 0) throw new Error('Begin the scene with a named step at time zero.');

  for (const step of trace.steps) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(step.step) || names.has(step.step)) {
      throw new Error('Step names must be unique kebab-case tokens.');
    }
    names.add(step.step);
    if (typeof step.meta?.caption !== 'string' || !step.meta.caption.trim()) {
      throw new Error(`Step ${step.step} needs a meta.caption.`);
    }
  }
}

export function makeNarratedScene(BaseScene, durations) {
  return class NarratedScene extends BaseScene {
    async endCurrentStep() {
      const step = this.current;
      if (step) {
        const duration = durations[step.name];
        if (!Number.isFinite(duration) || duration <= 0) throw new Error(`No audio duration for ${step.name}.`);
        const remaining = duration + tailSeconds - (this.time - step.t0);
        if (remaining > 0) await this.wait(Math.ceil(remaining * this.fps) / this.fps);
      }
      await super.endCurrentStep();
    }
  };
}
