'use strict';

const { test, expect } = require('../selfheal/fixtures');
const { smartLocator } = require('../selfheal/smartLocator');
const { HealingFailedError } = require('../selfheal/healingEngine');

const usernameField = smartLocator({
  name: 'username_field',
  primary: '#username_renamed',
  tag: 'input',
  attributes: { name: 'username', type: 'text' },
});

const passwordField = smartLocator({
  name: 'password_field',
  primary: '#password_renamed',
  tag: 'input',
  attributes: { name: 'password', type: 'password' },
});

const loginButton = smartLocator({
  name: 'login_button',
  primary: '#login-submit-btn',
  tag: 'button',
  attributes: { type: 'submit' },
  text: 'Login',
});

const flashSuccessMessage = smartLocator({
  name: 'flash_success_message',
  primary: '#flash-success',
  tag: 'div',
  attributes: { class: 'flash success' },
  text: 'You logged into a secure area!',
});

const flashErrorMessage = smartLocator({
  name: 'flash_error_message',
  primary: '#flash-error',
  tag: 'div',
  attributes: { class: 'flash error' },
  text: 'Your password is invalid!',
});

const logoutButtonBeforeLogin = smartLocator({
  name: 'logout_button_before_login',
  primary: '#logout',
  tag: 'button',
  attributes: {},
  text: 'Logout This Element Does Not Exist Anywhere On This Page',
});

test.describe('login page self-healing', () => {
  test('login with valid credentials heals stale locators', async ({ page, heal }) => {
    await page.goto('/login');

    const username = await heal.find(usernameField);
    await username.fill('tomsmith');

    const password = await heal.find(passwordField);
    await password.fill('SuperSecretPassword!');

    const login = await heal.find(loginButton);
    await login.click();

    const flash = await heal.find(flashSuccessMessage);
    await expect(flash).toContainText('You logged into a secure area!');
  });

  test('login with invalid password shows healed error flash', async ({ page, heal }) => {
    await page.goto('/login');

    const username = await heal.find(usernameField);
    await username.fill('tomsmith');

    const password = await heal.find(passwordField);
    await password.fill('wrong-password');

    const login = await heal.find(loginButton);
    await login.click();

    const flash = await heal.find(flashErrorMessage);
    const text = (await flash.textContent()) || '';
    expect(text.toLowerCase()).toContain('invalid');
  });

  test('healing reports unresolved when no real match exists', async ({ page, heal }) => {
    await page.goto('/login');

    await expect(heal.find(logoutButtonBeforeLogin)).rejects.toThrow(HealingFailedError);
  });
});
