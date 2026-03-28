const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fivem')
        .setDescription('Consulta el estado de un servidor de FiveM.')
        .addStringOption(option => 
            option.setName('ip')
                .setDescription('La IP o el CFX Code del servidor (ej: 127.0.0.1:30120 o abcdef)')
                .setRequired(true)),
    cooldown: 10,
    async execute(interaction) {
        let ip = interaction.options.getString('ip').trim();
        await interaction.deferReply();

        try {
            let apiUrl;
            let isCfx = !ip.includes(':') && !ip.includes('.');

            if (isCfx) {
                apiUrl = `https://servers-frontend.fivem.net/api/servers/single/${ip}`;
            } else {
                // Si es IP directa, intentamos obtener los datos de players.json
                if (!ip.startsWith('http')) ip = `http://${ip}`;
                apiUrl = `${ip}/players.json`;
            }

            const response = await axios.get(apiUrl, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            
            const embed = new EmbedBuilder()
                .setColor(0xffaa00)
                .setThumbnail('https://fivem.net/static/images/fivem-logo.png');

            if (isCfx) {
                const data = response.data.Data;
                const players = data.players.length;
                const maxPlayers = data.sv_maxclients;
                // La cola en FiveM suele estar en los metadatos o variables de servidor
                const queue = data.vars?.queue || '0'; 

                embed.setTitle(`📊 Estado del Servidor: ${data.hostname.replace(/\^[0-9]/g, '')}`)
                    .addFields(
                        { name: 'Jugadores', value: `👤 ${players}/${maxPlayers}`, inline: true },
                        { name: 'En Cola', value: `⏳ ${queue}`, inline: true },
                        { name: 'Versión Artefactos', value: `🛠️ ${data.server}`, inline: true },
                        { name: 'OneSync', value: data.vars?.onesync_enabled === 'true' ? '✅ Activo' : '❌ Desactivado', inline: true }
                    );
                
                if (data.connectEndPoints && data.connectEndPoints.length > 0) {
                    embed.addFields({ name: 'IP Directa', value: `\`${data.connectEndPoints[0]}\`` });
                }
            } else {
                // IP Directa (players.json)
                const players = response.data;
                embed.setTitle(`📊 Estado del Servidor (IP Directa)`)
                    .setDescription(`Conectado exitosamente a \`${ip}\``)
                    .addFields(
                        { name: 'Jugadores Online', value: `👤 ${players.length}`, inline: true }
                    );
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: '❌ No se pudo conectar con el servidor de FiveM. Asegúrate de que la IP sea correcta y el servidor esté encendido.' 
            });
        }
    },
};
