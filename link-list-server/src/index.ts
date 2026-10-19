import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.ts';
import listRoutes from './routes/listRoutes.ts';
import dictionaryRoutes from './routes/dictionaryRoutes.ts';
import { registerListHandlers } from './socket/listHandlers.ts';
import storeRoutes from './routes/storeRoutes.ts';
import cors from 'cors';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@link-list.nltrce5.mongodb.net/link-list`;
connectDB(uri);

app.use('/lists', listRoutes);
app.use('/dictionary', dictionaryRoutes);
app.use('/stores', storeRoutes);

io.on('connection', (socket) => {
    registerListHandlers(io, socket);
});