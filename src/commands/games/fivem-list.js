const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const db = require('../../services/DatabaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fivem-list')
        .setDescription('Muestra el estado de todos tus servidores FiveM favoritos.'),
    cooldown: 20,
    async execute(interaction) {
        const favorites = db.getFiveMFavorites(interaction.guildId);

        if (favorites.length === 0) {
            return interaction.reply({ content: '❌ No tienes servidores favoritos guardados. Usa `/fivem-fav add` para añadir uno.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
            .setTitle('📍 Servidores FiveM Pinned')
            .setDescription('Estado actual de los servidores guardados en el sistema.')
            .setColor(0x5865F2)
            .setThumbnail('https://i.imgur.com/vrqcOHB.gif')
            .setTimestamp();

        let description = '';

        for (const fav of favorites) {
            let ip = fav.server_ip;
            let isLink = ip.startsWith('http');

            if (isLink) {
                // Para enlaces directos (como Origen Network), simplemente mostramos el acceso
                description += `### 🟢 ${fav.server_name}\n`;
                description += `> 🔗 [Click para acceder al servidor](${ip})\n\n`;
                continue;
            }

            // --- DETECCIÓN AUTOMÁTICA DE TIPO DE ENLACE (CFX) ---
            let cleanCfx = ip;
            if (ip.includes('cfx.re/join/')) {
                cleanCfx = ip.split('/').pop();
            }

            let apiUrl;
            let isCfx = !cleanCfx.includes(':') && !cleanCfx.includes('.');

            if (isCfx) {
                apiUrl = `https://servers-frontend.fivem.net/api/servers/single/${cleanCfx}`;
            } else {
                let finalIp = cleanCfx.startsWith('http') ? cleanCfx : `http://${cleanCfx}`;
                apiUrl = `${finalIp}/players.json`;
            }

            try {
                const response = await axios.get(apiUrl, { timeout: 3000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                
                description += `### 🟢 ${fav.server_name}\n`;

                if (isCfx) {
                    const data = response.data.Data;
                    const players = data.players.length;
                    const maxPlayers = data.sv_maxclients;
                    const queue = data.vars?.queue || '0';
                    
                    description += `> 👤 **Jugadores:** \`${players}/${maxPlayers}\`\n`;
                    if (queue !== '0') description += `> ⏳ **Cola:** \`${queue}\`\n`;
                    description += `> 🌐 [Entrar por Web](https://cfx.re/join/${cleanCfx})\n`;
                    description += `> 🏎️ [Entrar Directo (FiveM)](fivem://connect/${cleanCfx})\n\n`;
                } else {
                    const players = response.data.length;
                    const finalCleanIp = cleanCfx.replace('http://', '').replace('https://', '');
                    description += `> 👤 **Jugadores:** \`${players}\`\n`;
                    description += `> 🏎️ [Entrar Directo (IP)](fivem://connect/${finalCleanIp})\n\n`;
                }
            } catch (error) {
                description += `### 🔴 ${fav.server_name}\n`;
                description += `> ⚠️ **Estado:** \`Desconectado o IP Inválida\`\n\n`;
            }
        }

        embed.setDescription(description || 'No se pudieron obtener datos.');

        await interaction.editReply({ embeds: [embed] });
    },
};
