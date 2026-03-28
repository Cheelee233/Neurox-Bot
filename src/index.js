require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const playdl = require('play-dl');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const express = require('express');

// Servidor Web para mantener el bot vivo en hostings gratuitos
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot de Discord está en línea 🟢');
});

app.listen(port, () => {
    logger.info(`Servidor web de mantenimiento escuchando en el puerto ${port}`);
});

// Validación de variables de entorno críticas
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || token === 'TU_TOKEN_AQUI' || !clientId || clientId === 'TU_CLIENT_ID_AQUI') {
    logger.error('CRÍTICO: DISCORD_TOKEN o CLIENT_ID no están configurados en el archivo .env.');
    logger.info('Por favor, edita el archivo .env y coloca tus credenciales reales del Discord Developer Portal.');
    process.exit(1);
}

// Configuración global de play-dl para evitar bloqueos
(async () => {
    // Esto ayuda a que YouTube no detecte al bot tan fácilmente
    try {
        await playdl.getFreeToken();
        logger.info('Token de play-dl obtenido correctamente.');
    } catch (e) {
        logger.warn('No se pudo obtener el token de play-dl: ' + e.message);
    }
})();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

// Inicializar el Reproductor de Música
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Cargar extractores estándar (YouTube, Spotify, etc.)
player.extractors.loadMulti(DefaultExtractors).then(() => {
    logger.info('Extractores de música cargados correctamente.');
});

client.player = player;
client.commands = new Collection();
client.cooldowns = new Collection();

// Cargar Comandos
const commands = [];
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(path.join(__dirname, `commands/${folder}`)).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
        } else {
            logger.warn(`El comando en ${file} no tiene las propiedades "data" o "execute".`);
        }
    }
}

// Cargar Eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Registro de comandos Slash
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        logger.info('Iniciando el registro global de comandos slash...');
        
        // Registro global (esto hace que el bot funcione en cualquier servidor)
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        logger.info('Comandos slash registrados globalmente con éxito.');
        
    } catch (error) {
        logger.error(`Error al registrar comandos slash: ${error.message}`);
    }
})();

client.login(process.env.DISCORD_TOKEN);
