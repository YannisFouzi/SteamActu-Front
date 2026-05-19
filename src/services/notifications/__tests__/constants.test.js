import {
  NOTIFICATION_CHANNEL_ID,
  IOS_CATEGORY_ID,
  ACTION_OPEN_NEWS,
  ACTION_UNFOLLOW_GAME,
  ACTION_FOLLOW_GAME,
} from '../constants';

describe('services/notifications/constants', () => {
  it('expose les constantes immuables attendues', () => {
    expect(NOTIFICATION_CHANNEL_ID).toBe('steam_news');
    expect(IOS_CATEGORY_ID).toBe('steam_news_actions');
    expect(ACTION_OPEN_NEWS).toBe('open-news');
    expect(ACTION_UNFOLLOW_GAME).toBe('unfollow-game');
    expect(ACTION_FOLLOW_GAME).toBe('follow-game');
  });
});
