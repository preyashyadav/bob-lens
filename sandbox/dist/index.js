import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupRoutes } from './server.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3334;
app.use(cors());
app.use(express.json({ limit: '10mb' }));
setupRoutes(app);
app.listen(PORT, () => {
    console.log(`Sandbox runner listening on port ${PORT}`);
});
// Made with Bob
//# sourceMappingURL=index.js.map