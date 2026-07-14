# WeatherScope — Portfolio Project

A responsive vanilla JavaScript weather dashboard built as a graduation portfolio project.

## Features

- City weather search
- GPS-based current location weather
- Eight upcoming 3-hour forecast cards
- Five-day forecast
- Celsius/Fahrenheit switching with saved preference
- Air Quality Index and PM2.5
- UV Index and risk label
- Favourite cities saved in local storage
- Recent city history with delete and clear-all
- Light/dark mode with saved preference
- Responsive mobile layout
- Loading, timeout, geolocation, validation, and API error states
- Vercel serverless API proxy so the OpenWeather key is not shipped to the browser

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript ES modules
- OpenWeather Current Weather, Forecast, and Air Pollution APIs
- Open-Meteo UV Index data
- Vercel Functions

## Local setup

1. Install Node.js 18 or newer.
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` in the project root:

```env
OPENWEATHER_API_KEY=your_openweather_api_key
```

4. Start the Vercel development server:

```bash
npm run dev
```

5. Open the local URL shown in the terminal. GPS requires browser location permission and works on localhost or HTTPS.

## Deploy to Vercel

### GitHub method

1. Push this project to a GitHub repository.
2. Import the repository in Vercel.
3. In **Project Settings → Environment Variables**, add:
   - Name: `OPENWEATHER_API_KEY`
   - Value: your OpenWeather API key
4. Deploy. Every later push creates a new deployment automatically.

### CLI method

```bash
npm install -g vercel
vercel
vercel --prod
```

Add `OPENWEATHER_API_KEY` in the Vercel project settings before the production deployment.

## Security note

Do not commit `.env.local` or API keys. The `/api/weather` serverless function keeps the OpenWeather key on the server side. Rotate any key that was previously committed or shared publicly.

## Portfolio talking points

- Separated UI, API, model, storage, and controller responsibilities
- Added a serverless proxy to avoid exposing secrets in frontend code
- Implemented persistent user preferences with localStorage
- Converted units client-side without duplicate API requests
- Used coordinates returned by the weather API to load AQI and UV data
- Included accessible status messages, pressed states, labels, and reduced-motion support


## Mobile support

The interface includes responsive mobile layouts, iPhone safe-area handling, touch-friendly controls, and horizontally scrollable hourly/5-day forecast cards.
