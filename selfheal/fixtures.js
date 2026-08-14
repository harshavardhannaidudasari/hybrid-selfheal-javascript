'use strict';

const base = require('@playwright/test');
const { find } = require('./healingEngine');

/**
 * Custom fixture exposing `heal.find(smartLocator)` bound to the current
 * test's page, plus an in-memory events array. On teardown, the collected
 * healing events are attached to the test result so the custom Reporter
 * can read them back via testInfo attachments (Playwright Test reporters
 * cannot see arbitrary data produced by test code otherwise).
 */
const test = base.test.extend({
  heal: async ({ page }, use, testInfo) => {
    const events = [];

    const healApi = {
      find: (smartLocator) => find(page, smartLocator, events),
      events,
    };

    await use(healApi);

    await testInfo.attach('healing-events', {
      body: Buffer.from(JSON.stringify(events)),
      contentType: 'application/json',
    });
  },
});

const expect = base.expect;

module.exports = { test, expect };
