// server.js - Main server file for the Shopify app
// At the top of server.js
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Add some debug output
console.log('Environment variables loaded:');
console.log('HOST:', process.env.HOST);
console.log('PORT:', process.env.PORT);
const express = require('express');
const { Shopify, ApiVersion } = require('@shopify/shopify-api');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables (in production use .env file or environment variables)
const {
    SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET,
    SCOPES,
    HOST,
    MONGO_URI,
    API_SECRET_KEY
} = process.env;

// Database connection
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Shopify API configuration
Shopify.Context.initialize({
    API_KEY: SHOPIFY_API_KEY,
    API_SECRET_KEY: SHOPIFY_API_SECRET,
    SCOPES: [
        'read_products',
        'read_orders',
        'read_customers',
        'read_inventory',
        'read_fulfillments',
        'read_shipping',
        'read_analytics'
    ],
    HOST_NAME: (HOST || '').replace(/^https:\/\//, ''),
    API_VERSION: ApiVersion.April22,
    IS_EMBEDDED_APP: true,
    SESSION_STORAGE: new Shopify.Session.MemorySessionStorage()
});

// Middleware
app.use(bodyParser.json());
app.use(session({
    secret: crypto.randomBytes(20).toString('hex'),
    resave: false,
    saveUninitialized: true
}));

// Models
const StoreSchema = new mongoose.Schema({
    shop: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    dataSelections: {
        orders: { type: Boolean, default: false },
        customers: { type: Boolean, default: false },
        products: { type: Boolean, default: false },
        inventory: { type: Boolean, default: false },
        analytics: { type: Boolean, default: false },
        completeStore: { type: Boolean, default: false }
    },
    apiKey: { type: String, unique: true }
});

const Store = mongoose.model('Store', StoreSchema);

// Routes

// Home route - redirects to auth if not authenticated
app.get('/', async (req, res) => {
    if (!req.query.shop) {
        return res.status(400).send('Missing shop parameter. Please add ?shop=your-shop.myshopify.com to your request');
    }

    const shop = req.query.shop;
    const storeData = await Store.findOne({ shop });

    if (storeData && storeData.accessToken) {
        // Store is already authenticated, redirect to dashboard
        return res.redirect(`/dashboard?shop=${shop}`);
    }

    // Redirect to auth
    const authRoute = await Shopify.Auth.beginAuth(
        req,
        res,
        shop,
        '/auth/callback',
        false
    );
    res.redirect(authRoute);
});

// Auth callback
app.get('/auth/callback', async (req, res) => {
    try {
        const session = await Shopify.Auth.validateAuthCallback(
            req,
            res,
            req.query
        );

        const shop = session.shop;
        const accessToken = session.accessToken;

        // Generate a unique API key for the store
        const apiKey = crypto.randomBytes(16).toString('hex');

        // Store the shop and access token
        await Store.findOneAndUpdate(
            { shop },
            {
                shop,
                accessToken,
                apiKey,
                dataSelections: {
                    orders: false,
                    customers: false,
                    products: false,
                    inventory: false,
                    analytics: false,
                    completeStore: false
                }
            },
            { upsert: true, new: true }
        );

        res.redirect(`/dashboard?shop=${shop}`);
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).send('Error during authentication');
    }
});

// Dashboard route
app.get('/dashboard', async (req, res) => {
    const shop = req.query.shop;

    if (!shop) {
        return res.status(400).send('Missing shop parameter');
    }

    const storeData = await Store.findOne({ shop });

    if (!storeData) {
        return res.redirect(`/?shop=${shop}`);
    }

    res.sendFile(__dirname + '/public/dashboard.html');
});

// API routes

// Update data selections
app.post('/api/data-selections', async (req, res) => {
    try {
        const shop = req.query.shop;
        const { dataSelections } = req.body;

        if (!shop) {
            return res.status(400).json({ error: 'Missing shop parameter' });
        }

        const storeData = await Store.findOneAndUpdate(
            { shop },
            { $set: { dataSelections } },
            { new: true }
        );

        if (!storeData) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json({
            success: true,
            apiKey: storeData.apiKey,
            apiUrl: `${HOST}/api/data/${storeData.apiKey}`
        });
    } catch (error) {
        console.error('Error updating data selections:', error);
        res.status(500).json({ error: 'An error occurred while updating data selections' });
    }
});

// Get store data (protected by API key)
app.get('/api/data/:apiKey', async (req, res) => {
    try {
        const { apiKey } = req.params;

        // Verify API key
        const storeData = await Store.findOne({ apiKey });

        if (!storeData) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const shop = storeData.shop;
        const { accessToken } = storeData;
        const client = new Shopify.Clients.Rest(shop, accessToken);

        const { dataSelections } = storeData;

        // Initialize response data
        const data = {};

        // Fetch selected data types
        if (dataSelections.completeStore || dataSelections.orders) {
            const orders = await client.get({
                path: 'orders',
                query: { limit: 250, status: 'any' }
            });
            data.orders = orders.body.orders;
        }

        if (dataSelections.completeStore || dataSelections.customers) {
            const customers = await client.get({
                path: 'customers',
                query: { limit: 250 }
            });
            data.customers = customers.body.customers;
        }

        if (dataSelections.completeStore || dataSelections.products) {
            const products = await client.get({
                path: 'products',
                query: { limit: 250 }
            });
            data.products = products.body.products;
        }

        if (dataSelections.completeStore || dataSelections.inventory) {
            const inventory = await client.get({
                path: 'inventory_items',
                query: { limit: 250 }
            });
            data.inventory = inventory.body.inventory_items;
        }

        if (dataSelections.completeStore || dataSelections.analytics) {
            // This would depend on what specific analytics you want to fetch
            // This is just a placeholder
            const analytics = await client.get({
                path: 'reports',
                query: { limit: 250 }
            });
            data.analytics = analytics.body.reports;
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching store data:', error);
        res.status(500).json({ error: 'An error occurred while fetching store data' });
    }
});

// Get API key info (for frontend)
app.get('/api/key-info', async (req, res) => {
    try {
        const shop = req.query.shop;

        if (!shop) {
            return res.status(400).json({ error: 'Missing shop parameter' });
        }

        const storeData = await Store.findOne({ shop });

        if (!storeData) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json({
            apiKey: storeData.apiKey,
            apiUrl: `${HOST}/api/data/${storeData.apiKey}`,
            dataSelections: storeData.dataSelections
        });
    } catch (error) {
        console.error('Error fetching API key info:', error);
        res.status(500).json({ error: 'An error occurred while fetching API key info' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});