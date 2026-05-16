export function healthRoute(req, res) {
    res.json({
        status: 'ok',
        service: 'bob-lens-sandbox',
        timestamp: new Date().toISOString(),
    });
}
// Made with Bob
//# sourceMappingURL=health.js.map