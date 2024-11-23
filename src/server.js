const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
}));

// Socket.io setup with CORS
const io = socketIO(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Constants
const PORT = process.env.PORT || 5000;
const LOCATION_UPDATE_INTERVAL = 2000;
const comands = {
    FORWARD: 'FORWARD_MOVEMENT',
    BACKWARD: 'BACKWARD_MOVEMENT',
    LEFT: 'LEFT_MOVEMENT',
    RIGHT: 'RIGHT_MOVEMENT',
    CHANGE_SPEED: 'CHANGE_SPEED',
    SAVE_LOCATION: 'SAVE_LOCATION',
    GET_LOCATION: 'GET_LOCATION',
    POWER_TOGGLE: 'POWER_TOGGLE',
    BOAT_STATE: 'BOAT_STATE',   
    STOP: 'STOP'    
  };

// Initial boat state
const boatState = {
    power: false,
    speed: 0,
    isMoving: false,
    maxSpeed: 100,
    minSpeed: 30,
    direction: "CW",
    location: {
        latitude: 23.8103,
        longitude: 90.4125
    },
};

// Middleware
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const sendBoatState = (socket) => {
    socket.emit(comands.BOAT_STATE, boatState);
}

// Socket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    // Power control
    socket.on(comands.POWER_TOGGLE, (state) => {
        boatState.power = state;
        if (state) {
           console.log('Boat powered on');
        } else {
           console.log('Boat powered off');
        }
        sendBoatState(socket);
    });

    socket.on(comands.STOP, () => {
        boatState.speed = 0;
        boatState.isMoving = false;
        boatState.direction = "CW";
        boatState.location = {
            latitude: 23.8103,
            longitude: 90.4125
        };
        console.log('Boat state reset to defaults');
        sendBoatState(socket);
    });

    socket.on(comands.FORWARD, () => {
        boatState.direction = "CW";
        boatState.speed = boatState.minSpeed;
        boatState.isMoving = true;
        console.log('Boat moving forward');
        sendBoatState(socket);
    });

    socket.on(comands.BACKWARD, () => {
        boatState.direction = "CCW";
        boatState.speed = boatState.minSpeed;
        boatState.isMoving = true;
        console.log('Boat moving backward');
        sendBoatState(socket);
    });

    socket.on(comands.LEFT, () => {
        boatState.direction = "LEFT";
        console.log('Boat moving left');
        sendBoatState(socket);
    });

    socket.on(comands.RIGHT, () => {
        boatState.direction = "RIGHT";
        console.log('Boat moving right');
        sendBoatState(socket);
    });

    socket.on(comands.CHANGE_SPEED, (speed) => {
        boatState.speed = speed;
        console.log('Speed changed to:', speed);
        sendBoatState(socket);
    });

    socket.on(comands.SAVE_LOCATION, (location) => {
        boatState.location = location;
        console.log('Location saved:', location);
        sendBoatState(socket);
    });

    socket.on(comands.VIDEO_FRAME, (frame) => {
        console.log('Video frame received');
        socket.broadcast.emit(comands.VIDEO_STREAM, frame);
    });

    // Error handling
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', 'An error occurred');
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (boatState.power) {
            boatState.power = false;
            console.log('Boat powered off');
        }
        sendBoatState(socket);
    });
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
