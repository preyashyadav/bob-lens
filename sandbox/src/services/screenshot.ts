import puppeteer from 'puppeteer';

interface ScreenshotOptions {
  waitTime?: number;
  fullPage?: boolean;
  width?: number;
  height?: number;
}

async function renderComponent(code: string, componentName: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 600, height: 400 });

    // Clean the JSX code — remove import/export statements
    const cleanCode = code
      .replace(/^import\s+.*?;?\s*$/gm, '')
      .replace(/^export\s+default\s+/gm, '')
      .replace(/^export\s+/gm, '')
      .trim();

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #f5f5f5;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      color: #333;
    }
    /* Common component styles */
    .card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 320px;
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      margin: 4px 4px 4px 0;
    }
    h1, h2, h3 { margin-bottom: 8px; }
    p { margin-bottom: 8px; color: #666; }
    input, select, textarea {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      width: 100%;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    ${cleanCode}

    // Try to find and render the component
    try {
      const Component = typeof ${componentName} !== 'undefined'
        ? ${componentName}
        : (typeof exports !== 'undefined' && exports.default)
          ? exports.default
          : null;

      if (Component) {
        // Generate reasonable default props based on common patterns
        const defaultProps = {
          title: 'Sample Title',
          name: 'Sample Name',
          subtitle: 'Sample subtitle text',
          description: 'A sample description for preview',
          label: 'Label',
          value: 'Value',
          text: 'Sample text',
          role: 'user',
          email: 'user@example.com',
          price: 99,
          count: 42,
          verified: true,
          active: true,
          disabled: false,
          onClick: () => {},
          onDelete: () => {},
          onSubmit: () => {},
          onChange: () => {},
          children: 'Content'
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Component, defaultProps));
      } else {
        document.getElementById('root').innerHTML =
          '<div style="color:#666;padding:16px">Component could not be rendered</div>';
      }
    } catch(e) {
      document.getElementById('root').innerHTML =
        '<div style="color:#f44747;padding:16px;font-family:monospace;font-size:12px">Render error: ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' as any, timeout: 20000 });

    // Wait for React to render
    await page.waitForSelector('#root > *', { timeout: 8000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Take screenshot of just the rendered component
    const rootElement = await page.$('#root');
    let screenshot: string;

    if (rootElement) {
      const box = await rootElement.boundingBox();
      if (box && box.height > 0) {
        screenshot = (await page.screenshot({
          encoding: 'base64',
          clip: {
            x: Math.max(0, box.x - 8),
            y: Math.max(0, box.y - 8),
            width: Math.min(600, box.width + 16),
            height: Math.min(400, box.height + 16),
          },
        })) as string;
      } else {
        screenshot = (await page.screenshot({ encoding: 'base64' })) as string;
      }
    } else {
      screenshot = (await page.screenshot({ encoding: 'base64' })) as string;
    }

    return screenshot;
  } finally {
    await browser.close();
  }
}

export async function captureScreenshot(
  code: string,
  _testInputs: any,
  _options: ScreenshotOptions = {}
): Promise<string | null> {
  try {
    return await renderComponent(code, 'App');
  } catch (error: any) {
    console.error('Screenshot capture failed:', error);
    return null;
  }
}

export async function renderComponentScreenshots(
  beforeCode: string,
  afterCode: string,
  componentName: string
): Promise<{ before: string; after: string; error?: string }> {
  try {
    const [before, after] = await Promise.all([
      renderComponent(beforeCode, componentName),
      renderComponent(afterCode, componentName),
    ]);
    return { before, after };
  } catch (error: any) {
    return {
      before: '',
      after: '',
      error: `Screenshot failed: ${error.message}`,
    };
  }
}
