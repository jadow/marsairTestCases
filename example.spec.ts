import { test, expect } from '@playwright/test';

const URL = 'https://marsair.recruiting.thoughtworks.net/FooYongJie';

test.describe('MarsAir Flight Booking - Comprehensive Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  /**
   * HAPPY CASE: DYNAMIC EXPANSION WITH OUTPUT
   * Tests all pairs where Return is >= 1 year after Departure.
   */
  test('Happy Case: All combinations with 1 year or more gap', async ({ page }) => {
    const options = await page.$$eval('#departing option', (elements) => 
      elements.map(el => ({ text: el.innerText.trim(), value: el.value })).filter(opt => opt.value !== "")
    );

    const results = [];

    for (let i = 0; i < options.length; i++) {
      for (let j = 0; j < options.length; j++) {
        // Gap of 2 indices = ~1 year in the MarsAir seasonal cycle
        if (j >= i + 2) {
          const departure = options[i];
          const returning = options[j];

          await page.selectOption('#departing', departure.value);
          await page.selectOption('#returning', returning.value);
          await page.click('input[type="submit"]');

          const contentText = await page.locator('#content').innerText();
          const isPossible = !contentText.includes('Unfortunately, this schedule is not possible');
          
          results.push({
            Departure: departure.text,
            Return: returning.text,
            Result: contentText
          });

          await expect(page.locator('#content')).not.toContainText('Unfortunately, this schedule is not possible');
          
          await page.goBack();
        }
      }
    }
    // Prints a clean table of all tested combinations in your terminal
    console.table(results);
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
    // Leave dropdowns at "Select..." (index 0)
    await page.selectOption('#departing', { index: 0 });
    await page.selectOption('#returning', { index: 0 });
    await page.click('input[type="submit"]');

    await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
  });
});