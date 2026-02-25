import { test, expect } from '@playwright/test';

const URL = 'https://marsair.recruiting.thoughtworks.net/FooYongJie';

test.describe('MarsAir Flight Booking - Comprehensive Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  /**
   * NAVIGATION & BRANDING CASES
   */
  test('Navigation: Slogan should link to Home', async ({ page }) => {
    const slogan = page.locator('text="Book a ticket to the red planet now!"');
    await expect(slogan).toBeVisible();
    await expect(slogan).toHaveJSProperty('tagName', 'A');
    await expect(slogan).toHaveAttribute('href', '/FooYongJie');
    await slogan.click();
    await expect(page).toHaveURL(URL);
  });

  test('Navigation: Logo should link to Home', async ({ page }) => {
    const logo = page.locator('h1 a, .logo a').first(); 
    await expect(logo).toBeVisible();
    await expect(logo).toHaveJSProperty('tagName', 'A');
    await expect(logo).toHaveAttribute('href', '/FooYongJie');
    await logo.click();
    await expect(page).toHaveURL(URL);
  });

  /**
   * HAPPY CASE: DYNAMIC EXPANSION WITH FULL TEXT OUTPUT
   */
  test('Happy Case: All combinations with 1 year or more gap', async ({ page }) => {
    const options = await page.$$eval('#departing option', (elements) => 
      elements.map(el => ({ text: el.innerText.trim(), value: el.value })).filter(opt => opt.value !== "")
    );

    const results = [];

    for (let i = 0; i < options.length; i++) {
      for (let j = 0; j < options.length; j++) {
        // 1 year gap logic
        if (j >= i + 2) {
          const departure = options[i];
          const returning = options[j];

          await page.selectOption('#departing', departure.value);
          await page.selectOption('#returning', returning.value);
          await page.click('input[type="submit"]');

          // Capture the text from the content area
          const contentText = (await page.locator('#content').innerText()).replace(/\n/g, ' ').trim();
          
          results.push({
            Departure: departure.text,
            Return: returning.text,
            Result: contentText // Captures the specific message for this pair
          });

          await expect(page.locator('#content')).not.toContainText('Unfortunately, this schedule is not possible');
          
          await page.goBack();
        }
      }
    }
    // Terminal will now show the exact text returned by the site for each pair
    console.table(results);
  });

  test('Validity: Valid code should be accepted', async ({ page }) => {
    const validCode = "JJ5-OPQ-005"; // 5+0+0 = 5 % 10 = 5
    await page.fill('#promotional_code', validCode);
    //we are just hardcoding this for simplicity sake bec i dont want dependency between the cases right now
    await page.selectOption('#departing', { index: 1 });
    await page.selectOption('#returning', { index: 6 });
    await page.click('input[type="submit"]');
    await expect(page.locator('#content')).toContainText(`Promotional code ${validCode} used: 50% discount!`);
  });

  test('Validity: Invalid check digit should show error', async ({ page }) => {
    const invalidCode = "JJ5-OPQ-321"; // Should end in 0, but we put 1
    await page.fill('#promotional_code', invalidCode);
    await page.selectOption('#departing', { index: 1 });
    await page.selectOption('#returning', { index: 6 });
    await page.click('input[type="submit"]');
    await expect(page.locator('#content')).toContainText(`Sorry, code ${invalidCode} is not valid`);
  });

  test('Validity: Incorrect format should show error', async ({ page }) => {
    const badFormat = "INVALID-CODE-123";
    await page.fill('#promotional_code', badFormat);
    await page.selectOption('#departing', { index: 1 });
    await page.selectOption('#returning', { index: 6 });
    await page.click('input[type="submit"]');
    await expect(page.locator('#content')).toContainText(`Sorry, code ${badFormat} is not valid`);
  });

  /** * NEGATIVE CASES 
   */
  test('Negative: Return is less than a year after Departure', async ({ page }) => {
    await page.selectOption('#departing', { index: 1 }); 
    await page.selectOption('#returning', { index: 2 }); 
    await page.click('input[type="submit"]');
    await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
  });

  test('Negative: Departure is same as Return', async ({ page }) => {
    await page.selectOption('#departing', { index: 1 });
    await page.selectOption('#returning', { index: 1 });
    await page.click('input[type="submit"]');
    await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
  });

  test('Negative: Departure is after Return', async ({ page }) => {
    await page.selectOption('#departing', { index: 2 }); 
    await page.selectOption('#returning', { index: 1 }); 
    await page.click('input[type="submit"]');
    await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
  });

  test('Negative: Mandatory fields not filled', async ({ page }) => {
    await page.selectOption('#departing', { index: 0 });
    await page.selectOption('#returning', { index: 0 });
    await page.click('input[type="submit"]');
    await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
  });
});