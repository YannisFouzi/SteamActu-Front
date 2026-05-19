import { TUTORIAL_STEPS, SUMMARY_STEP_INDEX } from '../steps';

describe('tutorial/steps', () => {
  it('expose 10 étapes', () => {
    expect(TUTORIAL_STEPS).toHaveLength(10);
  });

  it('chaque step a id + screen + titleKey + descriptionKey', () => {
    TUTORIAL_STEPS.forEach((step) => {
      expect(step.id).toEqual(expect.any(String));
      expect(step.screen).toEqual(expect.any(String));
      expect(step.titleKey).toMatch(/^tutorial\.steps\./);
      expect(step.descriptionKey).toMatch(/^tutorial\.steps\./);
    });
  });

  it('ids uniques', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('SUMMARY_STEP_INDEX pointe sur le dernier step (isSummary=true)', () => {
    expect(SUMMARY_STEP_INDEX).toBe(TUTORIAL_STEPS.length - 1);
    expect(TUTORIAL_STEPS[SUMMARY_STEP_INDEX].isSummary).toBe(true);
  });

  it('seul le dernier step a isSummary=true', () => {
    TUTORIAL_STEPS.slice(0, -1).forEach((step) => {
      expect(step.isSummary).toBeFalsy();
    });
  });

  it('steps "Settings" ont des targetId (sauf summary)', () => {
    TUTORIAL_STEPS.filter((s) => s.screen === 'Settings' && !s.isSummary).forEach(
      (step) => {
        expect(step.targetId).toBeTruthy();
      },
    );
  });
});
