import puppeteer from 'puppeteer';

interface ScreenshotOptions {
  waitTime?: number;
  fullPage?: boolean;
  width?: number;
  height?: number;
}

const PUPPETEER_HEADLESS = process.env.PUPPETEER_HEADLESS !== 'false';

export async function captureScreenshot(
  code: string,
  testInputs: any,
  options: ScreenshotOptions = {}
): Promise<string | null> {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: PUPPETEER_HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({
      width: options.width || 1280,
      height: options.height || 720,
    });

    // Create HTML with React component
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            const testInputs = ${JSON.stringify(testInputs)};
            ${code}
            
            // Render the component if it's exported
            if (typeof App !== 'undefined') {
              ReactDOM.render(<App {...testInputs} />, document.getElementById('root'));
            }
          </script>
        </body>
      </html>
    `;

    await page.setContent(html);
    
    // Wait for React to render (using setTimeout instead of deprecated waitForTimeout)
    await new Promise(resolve => setTimeout(resolve, options.waitTime || 1000));

    // Take screenshot
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: options.fullPage || false,
    });

    return screenshot as string;
  } catch (error: any) {
    console.error('Screenshot capture failed:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Made with Bob
