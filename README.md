# Shopify Data Connector for Power BI

A Shopify application that allows store owners to select specific data types they want to export (orders, customers, products, etc.) and generate API links that can be used with Power BI or other visualization tools.

## Features

- **Selective Data Export**: Choose which data from your Shopify store to make available (orders, customers, products, inventory, analytics, or complete store)
- **Secure API Generation**: Creates unique API keys for accessing your selected data
- **Power BI Integration**: Ready-to-use with Power BI's web data connector
- **Simple Dashboard**: User-friendly interface for selecting data and managing API access
- **Secure Authentication**: OAuth integration with Shopify

## Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- Shopify Partner account
- A publicly accessible domain or ngrok for development

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/shopify-data-connector.git
   cd shopify-data-connector
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Fill in your environment variables in the `.env` file:
   - Shopify API key and secret from your Shopify Partner Dashboard
   - MongoDB connection string
   - Your host URL

5. Register the app in Shopify Partner Dashboard:
   - Use the `manifest.json` file to create your app
   - Make sure the redirect URL matches your HOST/auth/callback

## Running the Application

### Development
```
npm run dev
```

### Production
```
npm start
```

## Setting Up in Shopify Store

1. Install the app from the Shopify App Store (or development link)
2. Authorize the app to access your store data
3. Select which data types you want to make available through the API
4. Generate your API link
5. Use the API link in Power BI or other visualization tools

## Connecting to Power BI

See the detailed guide in [docs/powerbi-connection-guide.md](docs/powerbi-connection-guide.md)

## File Structure

```
shopify-data-connector/
│
├── server.js                 # Main server application
├── package.json              # Node.js dependencies and scripts
├── .env                      # Environment variables (create from .env.example)
├── .env.example              # Example environment variables
├── manifest.json             # Shopify app manifest configuration
│
├── models/                   # MongoDB models
│   └── Store.js              # Store model for Shopify store data
│
├── public/                   # Static files
│   └── dashboard.html        # Main dashboard UI
│
└── docs/                     # Documentation
    └── powerbi-connection-guide.md  # Guide for connecting to Power BI
```

## API Endpoints

- `GET /` - Home route, redirects to auth if not authenticated
- `GET /auth/callback` - Shopify OAuth callback
- `GET /dashboard` - Main dashboard UI
- `POST /api/data-selections` - Update data selections
- `GET /api/data/:apiKey` - Get store data (protected by API key)
- `GET /api/key-info` - Get API key info for the store

## Security

- Each store gets a unique API key
- MongoDB stores sensitive data securely
- API requests are verified against stored API keys
- OAuth handles Shopify authentication securely

## License

MIT

## Support

For support, please open an issue on the GitHub repository or contact support@example.com.