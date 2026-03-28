const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

class DatabaseService {
    constructor() {
        const dbPath = path.join(__dirname, '../database/bot.sqlite');
        this.db = new Database(dbPath);
        this.init();
    }

    init() {
        // Tabla de configuración por servidor
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS guild_config (
                guild_id TEXT PRIMARY KEY,
                free_games_channel TEXT,
                admin_role_id TEXT,
                max_warnings INTEGER DEFAULT 3,
                welcome_channel TEXT,
                welcome_message TEXT,
                welcome_image TEXT
            )
        `).run();

        // Asegurar que las columnas nuevas existan (para bases de datos antiguas)
        const columns = this.db.prepare("PRAGMA table_info(guild_config)").all();
        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('welcome_channel')) {
            this.db.prepare("ALTER TABLE guild_config ADD COLUMN welcome_channel TEXT").run();
        }
        if (!columnNames.includes('welcome_message')) {
            this.db.prepare("ALTER TABLE guild_config ADD COLUMN welcome_message TEXT").run();
        }
        if (!columnNames.includes('welcome_image')) {
            this.db.prepare("ALTER TABLE guild_config ADD COLUMN welcome_image TEXT").run();
        }

        // Tabla de advertencias
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                user_id TEXT,
                reason TEXT,
                moderator_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // Tabla para evitar duplicados de juegos
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS free_games_history (
                game_id TEXT PRIMARY KEY,
                game_title TEXT,
                platform TEXT,
                posted_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // Tabla para servidores FiveM favoritos
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS fivem_favorites (
                guild_id TEXT,
                server_ip TEXT,
                server_name TEXT,
                PRIMARY KEY (guild_id, server_ip)
            )
        `).run();

        logger.info('Base de datos inicializada correctamente.');
    }

    // --- FiveM Favorites ---
    addFiveMFavorite(guildId, ip, name) {
        return this.db.prepare('INSERT OR REPLACE INTO fivem_favorites (guild_id, server_ip, server_name) VALUES (?, ?, ?)')
            .run(guildId, ip, name);
    }

    removeFiveMFavorite(guildId, name) {
        return this.db.prepare('DELETE FROM fivem_favorites WHERE guild_id = ? AND server_name = ?')
            .run(guildId, name);
    }

    getFiveMFavorites(guildId) {
        return this.db.prepare('SELECT * FROM fivem_favorites WHERE guild_id = ?').all(guildId);
    }

    // --- Guild Config ---
    getGuildConfig(guildId) {
        return this.db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
    }

    updateGuildConfig(guildId, config) {
        const current = this.getGuildConfig(guildId);
        if (current) {
            const keys = Object.keys(config);
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            this.db.prepare(`UPDATE guild_config SET ${setClause} WHERE guild_id = ?`)
                .run(...Object.values(config), guildId);
        } else {
            const keys = ['guild_id', ...Object.keys(config)];
            const values = [guildId, ...Object.values(config)];
            const placeholders = keys.map(() => '?').join(', ');
            this.db.prepare(`INSERT INTO guild_config (${keys.join(', ')}) VALUES (${placeholders})`)
                .run(...values);
        }
    }

    // --- Warnings ---
    addWarning(guildId, userId, reason, moderatorId) {
        this.db.prepare('INSERT INTO warnings (guild_id, user_id, reason, moderator_id) VALUES (?, ?, ?, ?)')
            .run(guildId, userId, reason, moderatorId);
        
        return this.db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?')
            .get(guildId, userId).count;
    }

    getWarnings(guildId, userId) {
        return this.db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC').all(guildId, userId);
    }

    clearWarnings(guildId, userId) {
        return this.db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    }

    // --- Free Games ---
    isGamePosted(gameId) {
        return !!this.db.prepare('SELECT 1 FROM free_games_history WHERE game_id = ?').get(gameId);
    }

    markGameAsPosted(gameId, title, platform) {
        this.db.prepare('INSERT INTO free_games_history (game_id, game_title, platform) VALUES (?, ?, ?)')
            .run(gameId, title, platform);
    }
}

module.exports = new DatabaseService();
