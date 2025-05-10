export const MOVE_INTERVAL = 1000; // ms debouncing
export const PAN_INTERVAL = 300; // ms debounce for panning
export const RECOVERY_TIME_AFTER_PAN = 500; // ms debounce from panning to movement

export const PAN_THRESHOLD = 0; // mm strict left / right boundary
export const ZOOM_INTERVAL = 300;
export const VOICE_AFTER_ZOOM_DELAY = 1000;

export const GEOCODE_INTERVAL = 1500; // ms to avoid rate limits

export const mapApiKey = process.env.API_KEY;
