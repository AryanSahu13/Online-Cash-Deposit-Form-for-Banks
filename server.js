const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { parse } = require('querystring');
const { MongoClient } = require('mongodb');
const express = require('express');

// MongoDB connection URL from environment variables
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'; // for running in MongoDB Compass
const dbName = 'bank';
const collectionName = 'deposits';

let db;
let collection;

// Connect to MongoDB
async function connectToMongo() {
    try {
        const client = await MongoClient.connect(mongoUrl, { useUnifiedTopology: true });
        db = client.db(dbName);
        collection = db.collection(collectionName);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

connectToMongo();

const app = express();

// Set static folder for serving CSS, JS, images, etc.
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'main.html'));
}); 

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;

    let filePath = path.join(__dirname, parsedUrl.pathname);
    if (filePath === path.join(__dirname, '/')) {
        filePath = path.join(__dirname, '/views/main.html'); // Ensure the path is correct
    }

    const extname = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif'
    }[extname] || 'text/plain';

    if (method === 'GET') {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                }
                console.error(`Error reading file ${filePath}:`, err);
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    } else if (parsedUrl.pathname === '/api/deposit' && method === 'POST') {
        // Handle form submission
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            console.log('Received body:', body);
            const data = parse(body);

            // Logging received data for debugging
            console.log('Parsed form data:', data);

            // Basic validation
            const requiredFields = [
                'BankName', 'BranchName', 'Date', 'Name', 'AccountNumber', 
                'IFSCCode', 'MobileNumber', 'AmountInNumbers', 
                'AmountInWords', 'Denominations', 'TotalAmount', 'PanNumber', 'MailId'
            ];

            for (const field of requiredFields) {
                if (!data[field]) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: `Missing required field: ${field}` }));
                    return;
                }
            }

            // Validate phone number (Indian format)
            if (!/^\d{10}$/.test(data.MobileNumber)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Mobile Number must be a 10-digit number.' }));
                return;
            }

            // Validate IFSC Code
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.IFSCCode)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'IFSC Code must be in the format ABCD0XXXXXX.' }));
                return;
            }

            if (!/^[a-zA-Z0-9]{10,12}$/.test(data.AccountNumber)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Account Number must be alphanumeric and 10 to 12 characters long.' }));
                return;
            }

            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.PanNumber)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'PAN Number must be in the format ABCDE1234F.' }));
                return;
            }

            const AmountInNumbers = parseFloat(data.AmountInNumbers);
            const TotalAmount = parseFloat(data.TotalAmount);
            const today = new Date();

            if (isNaN(AmountInNumbers) || isNaN(TotalAmount)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Amount fields must be valid numbers.' }));
                return;
            }

            if (AmountInNumbers <= 0 || TotalAmount <= 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Amount fields must be greater than zero.' }));
                return;
            }

            if (AmountInNumbers !== TotalAmount) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Amount in Numbers and Total Amount must match.' }));
                return;
            }

            if (typeof data.AmountInWords === 'number') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Amount in Words must not be an integer.' }));
                return;
            }

            if (new Date(data.Date) < today.setHours(0, 0, 0, 0)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Date must be today or later.' }));
                return;
            }

            // Insert data into MongoDB
            collection.insertOne(data, (err, result) => {
                if (err) {
                    console.error('Error inserting data into MongoDB:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to save deposit' }));
                    return;
                }
                console.log('Deposit inserted:', result);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Deposit received', deposit: data }));
            });
        });
    } else {
        // Handle 404 errors
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
