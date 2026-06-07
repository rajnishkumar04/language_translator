const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
let useDatabase = false;
let inMemoryHistory = [];

const formatTimestamp = (date) => {
    return new Date(date).toLocaleTimeString([], { hour12: false });
};

// Check if PostgreSQL database URL is configured
if (process.env.DATABASE_URL) {
    try {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
                ? false
                : { rejectUnauthorized: false } // Required for Render or external hosted Postgres
        });
        useDatabase = true;
        console.log('[Database] PostgreSQL configuration detected.');
    } catch (err) {
        console.error('[Database] Failed to initialize PostgreSQL pool:', err.message);
        useDatabase = false;
    }
} else {
    console.warn('[Database] DATABASE_URL not set. Falling back to in-memory history storage.');
}

async function initDB() {
    if (!useDatabase) return;
    
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS translation_history (
            id SERIAL PRIMARY KEY,
            source_text TEXT NOT NULL,
            translated_text TEXT NOT NULL,
            source_lang VARCHAR(10) NOT NULL,
            target_lang VARCHAR(10) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    try {
        await pool.query(createTableQuery);
        console.log('[Database] Database tables verified/initialized successfully.');
    } catch (err) {
        console.error('[Database] Failed to run database schema initialization:', err.message);
        console.warn('[Database] Disabling database and falling back to in-memory storage.');
        useDatabase = false;
    }
}

async function saveHistory(source, target, sLang, tLang) {
    if (useDatabase) {
        const insertQuery = `
            INSERT INTO translation_history (source_text, translated_text, source_lang, target_lang)
            VALUES ($1, $2, $3, $4)
            RETURNING created_at;
        `;
        try {
            const result = await pool.query(insertQuery, [source, target, sLang, tLang]);
            const createdAt = result.rows[0].created_at;
            return {
                timestamp: formatTimestamp(createdAt),
                source,
                target,
                sLang,
                tLang
            };
        } catch (err) {
            console.error('[Database] Error inserting translation history:', err.message);
            // Fall back to in-memory insert for this item
        }
    }
    
    // In-memory fallback
    const logItem = {
        timestamp: formatTimestamp(new Date()),
        source,
        target,
        sLang,
        tLang
    };
    inMemoryHistory.push(logItem);
    if (inMemoryHistory.length > 10) {
        inMemoryHistory.shift();
    }
    return logItem;
}

async function getHistory() {
    if (useDatabase) {
        const selectQuery = `
            SELECT source_text as source, translated_text as target, 
                   source_lang as "sLang", target_lang as "tLang", created_at 
            FROM translation_history 
            ORDER BY created_at DESC 
            LIMIT 10;
        `;
        try {
            const result = await pool.query(selectQuery);
            // Return sorted chronologically for frontend (since frontend prepends, or descending based on how frontend handles it. 
            // Wait, the frontend code did: allSessionLogs.forEach(log => { historyContainer.prepend(entry); });
            // Since frontend prepends, rendering descending logs from DB via prepend will show the newest on top? 
            // Let's check: if DB returns newest first (DESC), and frontend prepends, then the newest (first item) is prepended, 
            // then the second is prepended (so second becomes top, pushing first down!). 
            // That means the oldest would end up on top!
            // Wait! Let's check how frontend renders history:
            // "allSessionLogs.forEach(log => { ... historyContainer.prepend(entry); });"
            // If allSessionLogs has logs in chronological order (oldest first, newest last):
            // - oldest is prepended (it's at the bottom)
            // - ...
            // - newest is prepended (it ends up at the top!).
            // So allSessionLogs MUST be ordered oldest-first (ASC) so that when they are all prepended, the newest ends up on top!
            // Let's verify this: yes! If we return them from selectQuery as oldest-first (ASC) or order chronologically, then when the frontend prepends them, the newest will be on top.
            // Let's check how localStorage loaded them: translationHistory was pushed (so newest at the end).
            // Yes, translationHistory is oldest-first!
            // So we should sort them oldest-first (ASC) when returning from getHistory()!
            // Let's retrieve the last 10 DESC, but then reverse them to ASC before returning!
            const rows = result.rows.map(row => ({
                timestamp: formatTimestamp(row.created_at),
                source: row.source,
                target: row.target,
                sLang: row.sLang,
                tLang: row.tLang
            }));
            return rows.reverse(); // Now it is oldest first, newest last!
        } catch (err) {
            console.error('[Database] Error retrieving translation history:', err.message);
        }
    }
    
    // In-memory fallback
    return inMemoryHistory;
}

module.exports = {
    initDB,
    saveHistory,
    getHistory
};
