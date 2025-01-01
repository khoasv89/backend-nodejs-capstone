const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase(); // Step 2: task 1 - connect to DB
        const collection = db.collection("secondChanceItems"); // Step 2: task 2 - get collection
        const secondChanceItems = await collection.find({}).toArray(); // Step 2: task 3 - get all items
        res.json(secondChanceItems); // Step 2: task 4 - return items
    } catch (e) {
        logger.console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
// POST request to add a new secondChanceItem
router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        // Task 1: Connect to MongoDB
        const db = await connectToDatabase();
        
        // Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");

        // Task 3: Create a new secondChanceItem from the request body
        let secondChanceItem = req.body;

        // Task 4: Get the last id, increment it by 1, and set it to the new secondChanceItem
        const lastItemQuery = await collection.find().sort({ 'id': -1 }).limit(1); // Sort by id in descending order
        await lastItemQuery.forEach(item => {
            secondChanceItem.id = (parseInt(item.id) + 1).toString(); // Increment the last id
        });

        // Task 5: Set the current date to the new item
        const date_added = Math.floor(new Date().getTime() / 1000); // Get current timestamp
        secondChanceItem.date_added = date_added; // Set the date_added field

        // Task 6: Add the secondChanceItem to the database
        const result = await collection.insertOne(secondChanceItem); // Insert item into the collection

        // Task 7: Upload the image to the images directory
        if (req.file) {
            const uploadPath = path.join(__dirname, '..', 'public', 'images', req.file.filename);
            fs.renameSync(req.file.path, uploadPath); // Move the file to the correct directory
        }

        res.status(201).json(result.ops[0]); // Return the inserted item
    } catch (e) {
        next(e); // Pass errors to the error handling middleware
    }
});


// Get a single secondChanceItem by ID
// Get a specific secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params; // Extract the ID from the URL parameter
        
        // Task 1: Retrieve the database connection from db.js
        const db = await connectToDatabase();
        
        // Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");

        // Task 3: Find a specific secondChanceItem by its ID
        const secondChanceItem = await collection.findOne({ id: id });

        // Task 4: Return the secondChanceItem or error message if not found
        if (!secondChanceItem) {
            return res.status(404).send("secondChanceItem not found"); // Return 404 if the item doesn't exist
        }

        res.json(secondChanceItem); // Return the found item as JSON
    } catch (e) {
        next(e); // Pass any errors to the error handling middleware
    }
});

// Update an existing item
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params; // Extract the ID from the URL parameter

        // Task 1: Retrieve the database connection from db.js
        const db = await connectToDatabase();

        // Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");

        // Task 3: Check if the secondChanceItem exists
        const secondChanceItem = await collection.findOne({ id });
        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }

        // Task 4: Update the item's specific attributes
        secondChanceItem.category = req.body.category || secondChanceItem.category;
        secondChanceItem.condition = req.body.condition || secondChanceItem.condition;
        secondChanceItem.age_days = req.body.age_days || secondChanceItem.age_days;
        secondChanceItem.description = req.body.description || secondChanceItem.description;
        secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1));
        secondChanceItem.updatedAt = new Date();

        // Use findOneAndUpdate to update the item in the database
        const updateResult = await collection.findOneAndUpdate(
            { id },
            { $set: secondChanceItem },
            { returnDocument: 'after' } // Return the updated document
        );

        // Task 5: Send confirmation
        if (updateResult.value) {
            res.json({ message: "Item updated successfully" });
        } else {
            res.json({ message: "Failed to update item" });
        }
    } catch (e) {
        next(e); // Pass any errors to the error handling middleware
    }
});

// Delete an existing item
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params; // Extract the ID from the URL parameter

        // Task 1: Retrieve the database connection from db.js
        const db = await connectToDatabase();

        // Task 2: Use the collection() method to retrieve the secondChanceItems collection
        const collection = db.collection("secondChanceItems");

        // Task 3: Find a specific secondChanceItem by ID
        const secondChanceItem = await collection.findOne({ id });
        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }

        // Task 4: Delete the object and send an appropriate message
        await collection.deleteOne({ id });
        res.json({ message: "secondChanceItem deleted successfully" });
    } catch (e) {
        next(e); // Pass any errors to the error-handling middleware
    }
});

module.exports = router;
