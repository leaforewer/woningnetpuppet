import puppeteer from 'puppeteer';
import type { APIRoute } from 'astro';
export const prerender = false;

const returnResponse = (success: boolean, statuses: string[], message: string, statusCode: number) => {
    return new Response(
        JSON.stringify({ success, statuses, message }),
        { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
};

const createAnchorTag = (url: string, text: string) => {
    return `<a href="${url}" target="_blank">${text}</a>`;
};

export const POST: APIRoute = async ({ request }) => {
    const data = await request.formData();

    const username = data.get('username');
    const password = data.get('password');

    const statuses: string[] = [];
    const pushStatus = (message: string) => statuses.push(message);

    let browser;

    try {
        if (!username || !password) {
            return returnResponse(false, statuses, "Missing required fields", 400);
        }

        pushStatus("Starting the browser...");

        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--single-process',
                '--disable-extensions',
                '--headless=new',
            ],
        });


        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 800 });

        let entriesMade = 0;
        const maxEntriesAllowed = 2;
        let maxEntriesReached = false;

        try {
            // Navigate to login page
            await page.goto("https://utrecht.mijndak.nl", { waitUntil: "networkidle2" });
            pushStatus("Navigated to login page.");
            pushStatus(createAnchorTag(page.url(), "Current URL"));

            // Fill in the login form
            await page.type("#Input_UsernameVal", username.toString());
            pushStatus("Entered username.");
            await page.type("#Input_PasswordVal", password.toString());
            pushStatus("Entered password.");

            // Click the login button
            await page.waitForSelector('button[data-button]');
            await page.click('button[data-button]');
            pushStatus("Clicked login button.");

            // Wait for navigation after login
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            pushStatus("Login successful.");
            pushStatus(createAnchorTag(page.url(), "Current URL"));

            // Wait for the list of house elements to load
            await page.waitForSelector('a[data-advancedhtml]');
            const houseLinks = await page.$$eval('a[data-advancedhtml]', (anchors) =>
                anchors.map((a) => a.href)
            );
            pushStatus(`Found ${houseLinks.length} house links.`);

            // Loop through each house
            for (let i = 0; i < houseLinks.length; i++) {
                if (entriesMade >= maxEntriesAllowed || maxEntriesReached) {
                    pushStatus("Reached the maximum number of applicable entries. Stopping further actions.");
                    break;
                }

                const houseUrl = houseLinks[i];
                if (!houseUrl) {
                    pushStatus(`Invalid house URL at index ${i}. Skipping.`);
                    continue;
                }

                pushStatus(`Processing house ${createAnchorTag(houseUrl, (i + 1).toString())}...`);

                // Navigate to the house details page
                await page.goto(houseUrl, { waitUntil: 'networkidle2' });
                pushStatus(`Navigated to house details page. Current URL: ${createAnchorTag(page.url(), page.url())}`);

                // Check if the button says "Reageren op deze Woning"
                const buttonText = await page.evaluate(() => {
                    const button = document.querySelector('button[data-button]');
                    return button?.textContent?.trim() || null;
                });

                if (buttonText === "Reageren op deze Woning") {
                    try {
                        // Click the button and wait for feedback
                        await page.waitForSelector('button[data-button]:not([disabled])');
                        await page.click('button[data-button]');
                        pushStatus("Clicked 'Reageren op deze Woning' button.");

                        // Wait for feedback message
                        await page.waitForSelector('#feedbackMessageContainer', { timeout: 10000 });
                        const feedbackMessage = await page.evaluate(() => {
                            const element = document.querySelector('#feedbackMessageContainer .feedback-message-text');
                            return element?.textContent?.trim() || null;
                        });

                        if (feedbackMessage) {
                            pushStatus(`Feedback message detected: ${feedbackMessage}`);
                            if (feedbackMessage.includes('maximum aantal reacties')) {
                                pushStatus("Maximum number of entries reached. Stopping further actions.");
                                maxEntriesReached = true;
                            } else if (feedbackMessage.includes('opgeslagen')) {
                                pushStatus("Entry successful.");
                                entriesMade++;
                            }
                        } else {
                            pushStatus("No feedback message found, assuming success.");
                            entriesMade++;
                        }
                    } catch (error) {
                        pushStatus(`Error while detecting feedback: ${(error as Error).message}`);
                    }
                } else if (buttonText === "Reactie intrekken") {
                    pushStatus(`House already entered. Skipping to the next house: ${createAnchorTag(houseUrl, houseUrl)}`);
                } else {
                    pushStatus(`No valid button found on the page for house: ${createAnchorTag(houseUrl, houseUrl)}`);
                }

                // Return to the house list page
                await page.goBack({ waitUntil: 'networkidle2' });
                pushStatus("Returned to the house list.");
            }
        } catch (innerError) {
            console.error(innerError);
            pushStatus(`Error during process: ${(innerError as Error).message}`);
        } finally {
            await browser.close();
            pushStatus("Browser closed.");
        }

        return returnResponse(true, statuses, "Successfully joined homes.", 200);

    } catch (outerError) {
        pushStatus(`Unexpected error: ${(outerError as Error)}`);
        return returnResponse(false, statuses, (outerError as Error).message, 500);
    }
};
