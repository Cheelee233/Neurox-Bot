const logger = require('../utils/logger');
const FreeGamesService = require('../services/FreeGamesService');
const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.info(`¡Bot listo! Conectado como ${client.user.tag}`);

        // Eventos del Reproductor de Música
        client.player.events.on('playerStart', (queue, track) => {
            const embed = new EmbedBuilder()
                .setTitle('🎶 Reproduciendo Ahora')
                .setDescription(`**[${track.title}](${track.url})**`)
                .setThumbnail(track.thumbnail)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Duración', value: track.duration, inline: true },
                    { name: 'Canal', value: track.author, inline: true }
                )
                .setFooter({ text: `Pedido por ${track.requestedBy ? track.requestedBy.tag : (queue.metadata.user ? queue.metadata.user.tag : 'Desconocido')}` });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('music_pause').setLabel('⏸️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_skip').setLabel('⏭️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_stop').setLabel('🛑').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('music_queue').setLabel('📋').setStyle(ButtonStyle.Secondary),
                );

            queue.metadata.channel.send({ embeds: [embed], components: [row] });
        });

        client.player.events.on('emptyQueue', (queue) => {
            queue.metadata.channel.send('✅ Se ha terminado la cola de reproducción.');
        });

        client.player.events.on('error', (queue, error) => {
            logger.error(`Error en el reproductor: ${error.message}`);
        });

        client.player.events.on('playerError', (queue, error) => {
            logger.error(`Error en la reproducción: ${error.message}`);
        });

        // Iniciar el servicio de juegos gratuitos
        // Ejecutar inmediatamente al iniciar
        await FreeGamesService.checkFreeGames(client);

        // Programar chequeo periódico cada 3 días (00:00 cada 3 días)
        cron.schedule('0 0 */3 * *', async () => {
            logger.info('Iniciando chequeo periódico de juegos gratuitos (cada 3 días)...');
            await FreeGamesService.checkFreeGames(client);
        });

        logger.info('Tarea de juegos gratuitos programada cada 3 días.');
    },
};
