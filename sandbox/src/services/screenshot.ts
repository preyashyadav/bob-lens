import puppeteer from 'puppeteer';

interface ScreenshotOptions {
  waitTime?: number;
  fullPage?: boolean;
  width?: number;
  height?: number;
}

const PUPPETEER_HEADLESS = process.env.PUPPETEER_HEADLESS !== 'false';

const escapeHtml = (input: string) =>
  input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const buildHtml = (code: string, label?: string, testInputs?: any) => {
  // Extract component visual structure from JSX (heuristic, offline-safe).
  // This intentionally does not execute React/Babel in the sandbox.
  const hasButton = code.includes('button') || code.includes('Button');
  const hasTitle = code.includes('title') || code.includes('Title');
  const hasDelete = code.includes('delete') || code.includes('Delete');
  const propKeys =
    testInputs && typeof testInputs === 'object' ? Object.keys(testInputs).slice(0, 6) : [];
  const labelText = label ? escapeHtml(label) : 'Component';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 20px; background: #f5f5f5; font-family: system-ui; }
    .card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 300px; }
    .card-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .card-subtitle { font-size: 14px; color: #666; margin-bottom: 12px; }
    .card-footer { display: flex; gap: 8px; }
    .btn { padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 13px; }
    .btn-primary { background: #007acc; color: white; }
    .btn-danger { background: #f44747; color: white; }
    .badge { display: inline-block; font-size: 11px; color: #666; background: #eee; padding: 2px 6px; border-radius: 999px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${labelText} · Preview (offline)</div>
    ${hasTitle ? '<div class="card-title">Sample Card Title</div>' : ''}
    <div class="card-subtitle">Sample subtitle text</div>
    ${propKeys.length > 0 ? `<div class="card-subtitle">Props: ${escapeHtml(propKeys.join(', '))}${propKeys.length === 6 ? ', …' : ''}</div>` : ''}
    ${hasButton ? `<div class="card-footer">
      <button class="btn btn-primary">View Details</button>
      ${hasDelete ? '<button class="btn btn-danger">Delete</button>' : ''}
    </div>` : ''}
  </div>
</body>
</html>`;
};

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

    // Offline-safe rendering: plain HTML representation (no CDN, no React execution).
    await page.setContent(buildHtml(code, 'App', testInputs), { waitUntil: 'load', timeout: 15000 });
    
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

export async function renderComponentScreenshots(
  beforeCode: string,
  afterCode: string,
  componentName: string
): Promise<{ before: string; after: string; error?: string }> {
  const renderScreenshot = async (html: string): Promise<string> => {
    const browser = await puppeteer.launch({
      headless: PUPPETEER_HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 800, height: 600 });
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
      const screenshot = await page.screenshot({
        encoding: 'base64',
        clip: { x: 0, y: 0, width: 800, height: 300 }
      });
      return screenshot as string;
    } finally {
      await browser.close();
    }
  };

  try {
    const beforeHtml = buildHtml(beforeCode, componentName);
    const afterHtml = buildHtml(afterCode, componentName);

    const [beforeScreenshot, afterScreenshot] = await Promise.all([
      renderScreenshot(beforeHtml),
      renderScreenshot(afterHtml)
    ]);

    return {
      before: beforeScreenshot,
      after: afterScreenshot
    };
  } catch (error: any) {
    console.error('Component screenshot rendering failed:', error);
    return {
      before: '',
      after: '',
      error: error.message || 'Failed to render component screenshots'
    };
  }
}

// Made with Bob
