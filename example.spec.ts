import { test, expect } from '@playwright/test';

const URL = 'https://marsair.recruiting.thoughtworks.net/FooYongJie';

// --- Helper Functions ---
function generatePromoCode(discountDigit, d2, d3) {
  const prefix = "AF"; 
  const mid = "FJK";    
  const sum = discountDigit + d2 + d3;
  const checkDigit = sum % 10;
  return `${prefix}${discountDigit}-${mid}-${d2}${d3}${checkDigit}`;
}

test.describe('MarsAir Flight Booking Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  // ==========================================
  // SECTION 1: UI & NAVIGATION
  // ==========================================
  test.describe('Branding & Navigation', () => {
    test('Slogan should be a semantic link to Home', async ({ page }) => {
      const slogan = page.locator('text="Book a ticket to the red planet now!"');
      await expect(slogan).toBeVisible();
      await expect(slogan).toHaveJSProperty('tagName', 'A');
      await expect(slogan).toHaveAttribute('href', '/FooYongJie');
      await slogan.click();
      await expect(page).toHaveURL(URL);
    });

    test('Logo should be a semantic link to Home', async ({ page }) => {
      const logo = page.locator('h1 a, .logo a').first(); 
      await expect(logo).toBeVisible();
      await expect(logo).toHaveJSProperty('tagName', 'A');
      await expect(logo).toHaveAttribute('href', '/FooYongJie');
      await logo.click();
      await expect(page).toHaveURL(URL);
    });
  });

  // ==========================================
  // SECTION 2: CORE BOOKING LOGIC (HAPPY PATHS)
  // ==========================================
  test.describe('Search Functionality - Valid Dates', () => {
    test('Should display search results for all combinations with 1 year or more gap', async ({ page }) => {
      const options = await page.$$eval('#departing option', (elements) => 
        elements.map(el => ({ text: el.innerText.trim(), value: el.value })).filter(opt => opt.value !== "")
      );

      const results = [];
      for (let i = 0; i < options.length; i++) {
        for (let j = 0; j < options.length; j++) {
          if (j >= i + 2) {
            await page.selectOption('#departing', options[i].value);
            await page.selectOption('#returning', options[j].value);
            await page.click('input[type="submit"]');

            const contentText = (await page.locator('#content').innerText()).replace(/\n/g, ' ').trim();
            results.push({ Departure: options[i].text, Return: options[j].text, Result: contentText });

            await expect(page.locator('#content')).not.toContainText('Unfortunately, this schedule is not possible');
            await page.goBack();
          }
        }
      }
      console.table(results);
    });
  });

  // ==========================================
  // SECTION 3: SEARCH CONSTRAINTS (NEGATIVE PATHS)
  // ==========================================
  test.describe('Search Functionality - Constraint Validation', () => {
    test('Error: When return is less than a year after departure', async ({ page }) => {
      await page.selectOption('#departing', { index: 1 }); 
      await page.selectOption('#returning', { index: 2 }); 
      await page.click('input[type="submit"]');
      await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
    });

    test('Error: When departure and return are the same', async ({ page }) => {
      await page.selectOption('#departing', { index: 1 });
      await page.selectOption('#returning', { index: 1 });
      await page.click('input[type="submit"]');
      await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
    });

    test('Error: When departure is after return', async ({ page }) => {
      await page.selectOption('#departing', { index: 2 }); 
      await page.selectOption('#returning', { index: 1 }); 
      await page.click('input[type="submit"]');
      await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
    });

    test('Error: When mandatory fields are not selected', async ({ page }) => {
      await page.selectOption('#departing', { index: 0 });
      await page.selectOption('#returning', { index: 0 });
      await page.click('input[type="submit"]');
      await expect(page.locator('#content')).toContainText('Unfortunately, this schedule is not possible');
    });
  });

  // ==========================================
  // SECTION 4: PROMOTIONAL CODE SYSTEM
  // ==========================================
  test.describe('Promotional Code Engine', () => {
    
    test.describe('Discount Percentages', () => {
      const discounts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (const d of discounts) {
        test(`Code starting with ${d} should apply ${d}0% discount`, async ({ page }) => {
          const code = generatePromoCode(d, 0, 0);
          await page.fill('#promotional_code', code);
          await page.selectOption('#departing', { index: 1 });
          await page.selectOption('#returning', { index: 6 });
          await page.click('input[type="submit"]');
          await expect(page.locator('#content')).toContainText(`Promotional code ${code} used: ${d}0% discount!`);
        });
      }
    });

    test.describe('Checksum / Modulo Validation', () => {
      const checkDigits = [
        { d1: 1, d2: 0, d3: 9, expected: 0 }, { d1: 1, d2: 1, d3: 9, expected: 1 },
        { d1: 2, d2: 5, d3: 5, expected: 2 }, { d1: 3, d2: 0, d3: 0, expected: 3 },
        { d1: 4, d2: 5, d3: 5, expected: 4 }, { d1: 5, d2: 5, d3: 5, expected: 5 },
        { d1: 6, d2: 5, d3: 5, expected: 6 }, { d1: 7, d2: 5, d3: 5, expected: 7 },
        { d1: 8, d2: 5, d3: 5, expected: 8 }, { d1: 9, d2: 0, d3: 0, expected: 9 },
      ];

      for (const check of checkDigits) {
        test(`Verify checksum for digit ${check.expected}`, async ({ page }) => {
          const code = generatePromoCode(check.d1, check.d2, check.d3);
          await page.fill('#promotional_code', code);
          await page.selectOption('#departing', { index: 1 });
          await page.selectOption('#returning', { index: 6 });
          await page.click('input[type="submit"]');
          await expect(page.locator('#content')).toContainText(`Promotional code ${code} used`);
        });
      }
    });

    test.describe('Format & Pattern Validity', () => {
      test('Valid code (JJ5-OPQ-005) should be accepted', async ({ page }) => {
        const validCode = "JJ5-OPQ-005";
        await page.fill('#promotional_code', validCode);
        await page.selectOption('#departing', { index: 1 });
        await page.selectOption('#returning', { index: 6 });
        await page.click('input[type="submit"]');
        await expect(page.locator('#content')).toContainText(`Promotional code ${validCode} used: 50% discount!`);
      });

      test('Invalid check digit (JJ5-OPQ-321) should be rejected', async ({ page }) => {
        const invalidCode = "JJ5-OPQ-321";
        await page.fill('#promotional_code', invalidCode);
        await page.selectOption('#departing', { index: 1 });
        await page.selectOption('#returning', { index: 6 });
        await page.click('input[type="submit"]');
        await expect(page.locator('#content')).toContainText(`Sorry, code ${invalidCode} is not valid`);
      });

      test('Random string should be rejected', async ({ page }) => {
        const badFormat = "INVALID-CODE-123";
        await page.fill('#promotional_code', badFormat);
        await page.selectOption('#departing', { index: 1 });
        await page.selectOption('#returning', { index: 6 });
        await page.click('input[type="submit"]');
        await expect(page.locator('#content')).toContainText(`Sorry, code ${badFormat} is not valid`);
      });

      test('Incorrect characters in format (J25-...) should be rejected', async ({ page }) => {
        const badChars = "J25-OPQ-005";
        await page.fill('#promotional_code', badChars);
        await page.selectOption('#departing', { index: 1 });
        await page.selectOption('#returning', { index: 6 });
        await page.click('input[type="submit"]');
        await expect(page.locator('#content')).toContainText(`Sorry, code ${badChars} is not valid`);
      });
    });
  });
});