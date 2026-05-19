import {
  DEFAULT_STACK_SCREEN_OPTIONS,
  ROOT_STACK_SCREEN_OPTIONS,
} from '../options';

describe('navigation/options', () => {
  describe('DEFAULT_STACK_SCREEN_OPTIONS', () => {
    it('définit headerStyle, headerTintColor, headerTitleStyle', () => {
      expect(DEFAULT_STACK_SCREEN_OPTIONS).toMatchObject({
        headerStyle: expect.objectContaining({ backgroundColor: expect.any(String) }),
        headerTintColor: expect.any(String),
        headerTitleStyle: expect.objectContaining({ fontWeight: 'bold' }),
      });
    });
  });

  describe('ROOT_STACK_SCREEN_OPTIONS', () => {
    it('startup, login, home cachent le header', () => {
      expect(ROOT_STACK_SCREEN_OPTIONS.startup).toEqual({ headerShown: false });
      expect(ROOT_STACK_SCREEN_OPTIONS.login).toEqual({ headerShown: false });
      expect(ROOT_STACK_SCREEN_OPTIONS.home).toEqual({ headerShown: false });
    });
  });
});
