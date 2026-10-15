import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { List } from './models.ts';

dotenv.config();

mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
}));

app.use(express.json());

app.get('/lists', async (req, res) => {
    try {
        const lists = await List.find();
        res.json(lists);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lists' });
    }
});

app.post('/lists', async (req, res) => {
    try {
        const newList = new List({ name: req.body.name, items: [] });
        await newList.save();
        res.json(newList);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create list' });
    }
});

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});