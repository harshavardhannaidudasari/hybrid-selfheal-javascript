'use strict';

const { test, expect } = require('../selfheal/fixtures');
const { smartLocator } = require('../selfheal/smartLocator');

const startButton = smartLocator({
  name: 'start_button',
  primary: '#start-loading-btn',
  tag: 'button',
  attributes: {},
  text: 'Start',
});

const finishMessage = smartLocator({
  name: 'finish_message',
  primary: '#finish-heading',
  tag: 'h4',
  attributes: {},
  text: 'Hello World!',
});

test.describe('dynamic loading self-healing', () => {
  test('dynamic element appears after loading', async ({ page, heal }) => {
    await page.goto('/dynamic_loading/1');

    const start = await heal.find(startButton);
    await start.click();

    const finish = await heal.find(finishMessage);
    await finish.waitFor({ state: 'visible', timeout: 10000 });

    await expect(finish).toHaveText('Hello World!');
  });
});
