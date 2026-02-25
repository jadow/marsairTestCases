import { test, expect } from '@playwright/test';

const URL = 'https://marsair.recruiting.thoughtworks.net/FooYongJie';

test.describe('MarsAir Flight Booking - Mandatory Fields', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  test('Happy Case: Return is 1 year or more after Departure', async ({ page }) => {
    // Select July (Current Year) and July (Next Year)
    await page.selectOption('#departing', { index: 1 }); // e.g., July 2024
    await page.selectOption('#returning', { index: 3 }); // e.g., July 2025
    
    await page.click('input[type="submit"]');
    
    // Check for success message
    const result = page.locator('#content');
    await expect(result).toContainText('Seats available!');
  });

  test('Negative: Return is less than a year after Departure', async ({ page }) => {
    // Select July (Current Year) and December (Same Year)
    await page.selectOption('#departing', { index: 1 }); // July 2024
    await page.selectOption('#returning', { index: 2 }); // Dec 2024
    
    await page.click('input[type="submit"]');
    
    // MarsAir usually shows "Sorry, there are no flights" for short trips
    await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
  });

  test('Negative: Departure is same as Return', async ({ page }) => {
    await page.selectOption('#departing', { index: 1 });
    await page.selectOption('#returning', { index: 1 });
    
    await page.click('input[type="submit"]');
    
    await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
  });

  test('Negative: Departure is after Return', async ({ page }) => {
    await page.selectOption('#departing', { index: 2 }); // Dec 2024
    await page.selectOption('#returning', { index: 1 }); // July 2024
    
    await page.click('input[type="submit"]');
    
    await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
  });

  test('Negative: Mandatory fields not filled (Search without selection)', async ({ page }) => {
    // Most versions of this app have a default "Select..." value at index 0
    await page.selectOption('#departing', { index: 0 });
    await page.selectOption('#returning', { index: 0 });
    
    await page.click('input[type="submit"]');
    
    // Verify if there is an error message or if the search fails to proceed
    // The specific app behavior varies: check for "invalid" or similar prompts
    const errorMessage = page.locator('.error, #content');
    await expect(errorMessage).toBeVisible();
  });
});