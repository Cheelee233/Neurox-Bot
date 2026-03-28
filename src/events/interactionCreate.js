const { Collection, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const axios = require('axios');
const db = require('../services/DatabaseService');
const { useMainPlayer, useQueue } = require('discord-player');
const FreeGamesService = require('../services/FreeGamesService');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            // --- LOG DE DEPURACIÓN PARA INTERACCIONES ---
            if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
                logger.info(`Interacción recibida: ${interaction.customId} | Tipo: ${interaction.type} | Usuario: ${interaction.user.tag}`);
            }

            // --- MANEJAR MENÚS DE SELECCIÓN (DASHBOARD) ---
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'hub_category_select') {
                    const category = interaction.values[0];
                    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                    let rows = [interaction.message.components[0]];

                    const buttonRow = new ActionRowBuilder();

                    if (category === 'cat_music') {
                        embed.setTitle('🎵 Neurox • Centro de Música')
                             .setDescription('Gestiona la música del servidor.\n\n- **Poner Música**: Abre el buscador.\n- **Parar**: Limpia la cola y sale del canal.\n- **Cola**: Mira las próximas canciones.')
                             .setColor(0x00A2E8);
                        
                        buttonRow.addComponents(
                            new ButtonBuilder().setCustomId('hub_music_play').setLabel('Poner Música').setStyle(ButtonStyle.Success).setEmoji('🔍'),
                            new ButtonBuilder().setCustomId('hub_music_stop').setLabel('Parar Todo').setStyle(ButtonStyle.Danger).setEmoji('🛑'),
                            new ButtonBuilder().setCustomId('hub_music_queue').setLabel('Ver Cola').setStyle(ButtonStyle.Secondary).setEmoji('📋')
                        );
                    } else if (category === 'cat_games') {
                        embed.setTitle('🎮 Neurox • Juegos Gratis')
                             .setDescription('Consulta las últimas ofertas de juegos gratuitos.\n\n- **Actualizar**: Busca ofertas nuevas en tiempo real.')
                             .setColor(0xFF4500);
                        
                        buttonRow.addComponents(
                            new ButtonBuilder().setCustomId('hub_games_free').setLabel('Ver Juegos Gratis').setStyle(ButtonStyle.Primary).setEmoji('🔥')
                        );
                    } else if (category === 'cat_fivem') {
                        embed.setTitle('🏎️ Neurox • FiveM Hub')
                             .setDescription('Estado de tus servidores de Roleplay favoritos.\n\n- **Actualizar**: Refresca la lista de jugadores y colas.')
                             .setColor(0xFFD700);
                        
                        buttonRow.addComponents(
                            new ButtonBuilder().setCustomId('refresh_fivem_list').setLabel('Actualizar Estado').setStyle(ButtonStyle.Primary).setEmoji('🔄')
                        );
                    } else if (category === 'cat_admin') {
                        embed.setTitle('⚙️ Neurox • Administración')
                             .setDescription('Ajustes internos del bot y servidores FiveM.\n\n- **Añadir/Quitar FiveM**: Gestiona la lista de servidores fijados.\n- **Configuración**: Cambia canales y roles.')
                             .setColor(0x7289DA);
                        
                        buttonRow.addComponents(
                            new ButtonBuilder().setCustomId('hub_admin_fivem_add').setLabel('Añadir FiveM').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
                            new ButtonBuilder().setCustomId('hub_admin_fivem_remove').setLabel('Quitar FiveM').setStyle(ButtonStyle.Secondary).setEmoji('➖'),
                            new ButtonBuilder().setCustomId('hub_admin_setup').setLabel('Config Bot').setStyle(ButtonStyle.Danger).setEmoji('🔧'),
                            new ButtonBuilder().setCustomId('hub_admin_welcome').setLabel('Config Bienvenida').setStyle(ButtonStyle.Success).setEmoji('👋')
                        );
                    } else if (category === 'cat_utils') {
                        embed.setTitle('🛠️ Neurox • Utilidades')
                             .setDescription('Herramientas útiles para el servidor.\n\n- **Resumen rápido**: Analiza los últimos mensajes para darte un resumen de lo ocurrido.')
                             .setColor(0x95A5A6);
                        
                        buttonRow.addComponents(
                            new ButtonBuilder().setCustomId('hub_util_resumen').setLabel('Resumen Rápido').setStyle(ButtonStyle.Primary).setEmoji('📝')
                        );
                    } else if (category === 'cat_help') {
                        embed.setTitle('📜 Neurox • Lista de Comandos')
                             .setDescription('Aquí tienes todos los comandos disponibles organizados por categoría.')
                             .setColor(0xF1C40F)
                             .addFields(
                                 { name: '🎵 Música', value: '`/play`, `/skip`, `/stop`, `/queue`, `/nowplaying`', inline: false },
                                 { name: '🎮 FiveM', value: '`/fivem`, `/fivem-list`, `/fivem-fav`, `/fivem-setup-panel`', inline: false },
                                 { name: '🛠️ Utilidades', value: '`/resumen`, `/freegames`', inline: false },
                                 { name: '🛡️ Moderación', value: '`/warn`, `/warnings`, `/unwarn`, `/clear`', inline: false },
                                 { name: '⚙️ Administración', value: '`/setup`, `/setup-hub`', inline: false }
                             );
                    }

                    if (buttonRow.components.length > 0) rows.push(buttonRow);
                    return await interaction.update({ embeds: [embed], components: rows });
                }
            }

            // --- MANEJAR BOTONES DEL HUB ---
            if (interaction.isButton()) {
                const player = useMainPlayer();
                const queue = useQueue(interaction.guildId);

                // Botón: Poner Música (Abre Modal)
                if (interaction.customId === 'hub_music_play') {
                    const modal = new ModalBuilder().setCustomId('modal_music_play').setTitle('Reproducir Música');
                    const musicInput = new TextInputBuilder().setCustomId('music_query').setLabel("Nombre de la canción o link").setStyle(TextInputStyle.Short).setPlaceholder('Ej: Alex Rose Me Fije').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(musicInput));
                    return await interaction.showModal(modal);
                }

                // Botón: Ver Cola
                if (interaction.customId === 'hub_music_queue' || interaction.customId === 'music_queue') {
                    if (!queue) return interaction.reply({ content: 'La cola está vacía.', flags: [MessageFlags.Ephemeral] });
                    const tracks = queue.tracks.toArray().slice(0, 5);
                    const embed = new EmbedBuilder().setTitle('📋 Cola Actual').setDescription(tracks.map((t, i) => `**${i+1}.** ${t.title}`).join('\n') || 'No hay más canciones.').setColor(0x00FF00);
                    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }

                // Controles Rápidos de Música
                if (interaction.customId === 'music_skip') {
                    if (!queue) return interaction.reply({ content: 'No hay música.', flags: [MessageFlags.Ephemeral] });
                    queue.node.skip();
                    return interaction.reply({ content: '⏭️ Saltada.', flags: [MessageFlags.Ephemeral] });
                }

                if (interaction.customId === 'music_pause') {
                    if (!queue) return interaction.reply({ content: 'No hay música.', flags: [MessageFlags.Ephemeral] });
                    const paused = queue.node.setPaused(!queue.node.isPaused());
                    return interaction.reply({ content: paused ? '⏸️ Pausado.' : '▶️ Reanudado.', flags: [MessageFlags.Ephemeral] });
                }

                if (interaction.customId === 'music_stop' || interaction.customId === 'hub_music_stop') {
                    if (!queue) return interaction.reply({ content: 'No hay música.', flags: [MessageFlags.Ephemeral] });
                    queue.delete();
                    return interaction.reply({ content: '🛑 Detenido y cola limpiada.', flags: [MessageFlags.Ephemeral] });
                }

                // Botón: Juegos Gratis
                if (interaction.customId === 'hub_games_free') {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const csGames = await FreeGamesService.getCheapSharkGames();
                    const epicGames = await FreeGamesService.getEpicGames();
                    const allGames = [...csGames, ...epicGames].slice(0, 5);
                    if (allGames.length === 0) return interaction.editReply('No hay juegos gratis ahora.');
                    const embeds = allGames.map(g => FreeGamesService.createGameEmbed(g));
                    return interaction.editReply({ embeds });
                }

                // Botón: Resumen Rápido (Utilidades)
                if (interaction.customId === 'hub_util_resumen') {
                    const modal = new ModalBuilder()
                        .setCustomId('modal_util_resumen')
                        .setTitle('Resumen del Canal');

                    const channelInput = new TextInputBuilder()
                        .setCustomId('resumen_channel_id')
                        .setLabel("ID del Canal (Vacío = Actual)")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ej: 123456789...')
                        .setRequired(false);

                    modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
                    return await interaction.showModal(modal);
                }

                // Botón: Configuración Bienvenida (Modal)
                if (interaction.customId === 'hub_admin_welcome') {
                    try {
                        const config = db.getGuildConfig(interaction.guildId) || {};
                        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
                        const hasAdminRole = config.admin_role_id && interaction.member.roles.cache.has(config.admin_role_id);
                        if (!isAdmin && !hasAdminRole) return interaction.reply({ content: '❌ No tienes permisos.', flags: [MessageFlags.Ephemeral] });
                        const modal = new ModalBuilder().setCustomId('modal_welcome_setup').setTitle('Configuración de Bienvenida');
                        const channelInput = new TextInputBuilder().setCustomId('welcome_channel').setLabel("ID Canal de Bienvenida").setStyle(TextInputStyle.Short).setPlaceholder('Ej: 123456789...').setValue(config.welcome_channel || '').setRequired(false);
                        const messageInput = new TextInputBuilder().setCustomId('welcome_message').setLabel("Mensaje (Usa {user} y {guild})").setStyle(TextInputStyle.Paragraph).setPlaceholder('¡Bienvenido {user} a {guild}!').setValue(config.welcome_message || '').setRequired(false);
                        const imageInput = new TextInputBuilder().setCustomId('welcome_image').setLabel("URL de la Imagen (GIF/PNG)").setStyle(TextInputStyle.Short).setPlaceholder('https://i.imgur.com/...').setValue(config.welcome_image || '').setRequired(false);
                        modal.addComponents(new ActionRowBuilder().addComponents(channelInput), new ActionRowBuilder().addComponents(messageInput), new ActionRowBuilder().addComponents(imageInput));
                        return await interaction.showModal(modal);
                    } catch (error) { return interaction.reply({ content: '❌ Error al abrir configuración.', flags: [MessageFlags.Ephemeral] }); }
                }

                // Botón: Configuración General Bot (Modal)
                if (interaction.customId === 'hub_admin_setup') {
                    try {
                        const config = db.getGuildConfig(interaction.guildId) || {};
                        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
                        const hasAdminRole = config.admin_role_id && interaction.member.roles.cache.has(config.admin_role_id);
                        
                        if (!isAdmin && !hasAdminRole) {
                            return interaction.reply({ content: '❌ No tienes permisos de Administrador o el Rol Staff configurado.', flags: [MessageFlags.Ephemeral] });
                        }

                        const modal = new ModalBuilder().setCustomId('modal_bot_setup').setTitle('Configuración del Bot');
                        
                        const channelInput = new TextInputBuilder()
                            .setCustomId('setup_channel')
                            .setLabel("ID Canal Juegos Gratis")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Ej: 123456789...')
                            .setValue(config.free_games_channel?.toString() || '')
                            .setRequired(false);

                        const roleInput = new TextInputBuilder()
                            .setCustomId('setup_role')
                            .setLabel("ID Rol Staff/Admin")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Ej: 987654321...')
                            .setValue(config.admin_role_id?.toString() || '')
                            .setRequired(false);

                        const warnInput = new TextInputBuilder()
                            .setCustomId('setup_warns')
                            .setLabel("Máx Advertencias")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Por defecto: 3')
                            .setValue(config.max_warnings?.toString() || '3')
                            .setRequired(false);

                        modal.addComponents(
                            new ActionRowBuilder().addComponents(channelInput), 
                            new ActionRowBuilder().addComponents(roleInput), 
                            new ActionRowBuilder().addComponents(warnInput)
                        );
                        
                        return await interaction.showModal(modal);
                    } catch (error) { 
                        logger.error(`Error al abrir modal setup: ${error.message}`);
                        return interaction.reply({ content: '❌ Error al abrir el formulario. Verifica los IDs.', flags: [MessageFlags.Ephemeral] }); 
                    }
                }

                // Botones FiveM
                if (interaction.customId === 'hub_admin_fivem_add') {
                    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ No tienes permisos.', flags: [MessageFlags.Ephemeral] });
                    const modal = new ModalBuilder().setCustomId('modal_fivem_add').setTitle('Añadir Servidor FiveM');
                    const ipInput = new TextInputBuilder().setCustomId('fivem_ip').setLabel("IP o Código CFX").setStyle(TextInputStyle.Short).setRequired(true);
                    const nameInput = new TextInputBuilder().setCustomId('fivem_name').setLabel("Nombre del Servidor").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(ipInput), new ActionRowBuilder().addComponents(nameInput));
                    return await interaction.showModal(modal);
                }

                if (interaction.customId === 'hub_admin_fivem_remove') {
                    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ No tienes permisos.', flags: [MessageFlags.Ephemeral] });
                    const modal = new ModalBuilder().setCustomId('modal_fivem_remove').setTitle('Quitar Servidor FiveM');
                    const nameInput = new TextInputBuilder().setCustomId('fivem_name_remove').setLabel("Nombre del Servidor a eliminar").setStyle(TextInputStyle.Short).setPlaceholder('Ej: Origen Network').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                    return await interaction.showModal(modal);
                }

                if (interaction.customId === 'refresh_fivem_list') {
                    const favorites = db.getFiveMFavorites(interaction.guildId);
                    if (favorites.length === 0) return interaction.reply({ content: '❌ No tienes servidores favoritos guardados.', flags: [MessageFlags.Ephemeral] });
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const embed = new EmbedBuilder().setTitle('📍 Servidores FiveM Pinned').setDescription('Estado actual de los servidores guardados en el sistema.').setColor(0x5865F2).setThumbnail('https://i.imgur.com/vrqcOHB.gif').setTimestamp();
                    let description = '';
                    for (const fav of favorites) {
                        let ip = fav.server_ip;
                        let isLink = ip.startsWith('http');
                        if (isLink) {
                            description += `### 🟢 ${fav.server_name}\n> 🔗 [Click para acceder al servidor](${ip})\n\n`;
                            continue;
                        }
                        let cleanCfx = ip;
                        if (ip.includes('cfx.re/join/')) cleanCfx = ip.split('/').pop();
                        let apiUrl;
                        let isCfx = !cleanCfx.includes(':') && !cleanCfx.includes('.');
                        if (isCfx) apiUrl = `https://servers-frontend.fivem.net/api/servers/single/${cleanCfx}`;
                        else apiUrl = `${cleanCfx.startsWith('http') ? cleanCfx : `http://${cleanCfx}`}/players.json`;
                        try {
                            const response = await axios.get(apiUrl, { timeout: 3000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                            description += `### 🟢 ${fav.server_name}\n`;
                            if (isCfx) {
                                const data = response.data.Data;
                                description += `> 👤 **Jugadores:** \`${data.players.length}/${data.sv_maxclients}\`\n`;
                                if (data.vars?.queue !== '0') description += `> ⏳ **Cola:** \`${data.vars?.queue}\`\n`;
                                description += `> 🌐 [Entrar por Web](https://cfx.re/join/${cleanCfx})\n> 🏎️ [Entrar Directo (FiveM)](fivem://connect/${cleanCfx})\n\n`;
                            } else {
                                description += `> 👤 **Jugadores:** \`${response.data.length}\`\n> 🏎️ [Entrar Directo (IP)](fivem://connect/${cleanCfx.replace(/https?:\/\//, '')})\n\n`;
                            }
                        } catch (e) { description += `### 🔴 ${fav.server_name}\n> ⚠️ **Estado:** \`Desconectado o IP Inválida\`\n\n`; }
                    }
                    embed.setDescription(description || 'No se pudieron obtener datos.');
                    return await interaction.editReply({ embeds: [embed] });
                }
            }

            // --- MANEJAR FORMULARIOS (MODALS) ---
            if (interaction.isModalSubmit()) {
                // Modal: Resumen del Canal
                if (interaction.customId === 'modal_util_resumen') {
                    const channelId = interaction.fields.getTextInputValue('resumen_channel_id');
                    const targetChannel = channelId ? interaction.guild.channels.cache.get(channelId) : interaction.channel;

                    if (!targetChannel || !targetChannel.isTextBased()) {
                        return interaction.reply({ content: '❌ ID de canal inválida o el canal no es de texto.', flags: [MessageFlags.Ephemeral] });
                    }

                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    try {
                        const messages = await targetChannel.messages.fetch({ limit: 30 });
                        const filtered = messages.filter(m => !m.author.bot && m.content.length > 2);

                        if (filtered.size < 3) return interaction.editReply('❌ No hay suficientes mensajes reales en ese canal.');

                        const participants = new Map();
                        const keyPhrases = [];

                        filtered.forEach(m => {
                            participants.set(m.author.username, (participants.get(m.author.username) || 0) + 1);
                            if (m.content.length > 40 || m.content.includes('!') || m.content.includes('?')) {
                                keyPhrases.push(`**${m.author.username}**: ${m.content.substring(0, 60)}${m.content.length > 60 ? '...' : ''}`);
                            }
                        });

                        const topParticipants = [...participants.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([name, count]) => `${name} (${count} msgs)`)
                            .join(', ');

                        const embed = new EmbedBuilder()
                            .setTitle(`📝 Resumen: #${targetChannel.name}`)
                            .setColor(0x3498DB)
                            .addFields(
                                { name: '👤 Participantes Activos', value: topParticipants || 'N/A' },
                                { name: '📌 Puntos Destacados', value: keyPhrases.slice(-5).reverse().join('\n') || 'No se detectaron puntos clave.' }
                            );

                        return interaction.editReply({ embeds: [embed] });
                    } catch (e) {
                        return interaction.editReply('❌ No tengo permisos para leer ese canal o la ID es incorrecta.');
                    }
                }

                if (interaction.customId === 'modal_music_play') {
                    const query = interaction.fields.getTextInputValue('music_query');
                    const channel = interaction.member.voice.channel;
                    if (!channel) return interaction.reply({ content: 'Entra en un canal de voz.', flags: [MessageFlags.Ephemeral] });
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                    const player = useMainPlayer();
                    try {
                        await player.play(channel, query, { nodeOptions: { metadata: { channel: interaction.channel, user: interaction.user } } });
                        return interaction.editReply(`🎵 Buscando y reproduciendo: **${query}**`);
                    } catch (e) { return interaction.editReply('❌ Error al poner música.'); }
                }

                if (interaction.customId === 'modal_fivem_add') {
                    const ip = interaction.fields.getTextInputValue('fivem_ip');
                    const name = interaction.fields.getTextInputValue('fivem_name');
                    db.addFiveMFavorite(interaction.guildId, ip, name);
                    return interaction.reply({ content: `✅ Servidor **${name}** guardado.`, flags: [MessageFlags.Ephemeral] });
                }

                if (interaction.customId === 'modal_fivem_remove') {
                    const name = interaction.fields.getTextInputValue('fivem_name_remove');
                    const result = db.removeFiveMFavorite(interaction.guildId, name);
                    if (result.changes > 0) return interaction.reply({ content: `✅ Servidor **${name}** eliminado.`, flags: [MessageFlags.Ephemeral] });
                    else return interaction.reply({ content: `❌ No encontrado: **${name}**.`, flags: [MessageFlags.Ephemeral] });
                }

                if (interaction.customId === 'modal_welcome_setup') {
                    const channelId = interaction.fields.getTextInputValue('welcome_channel');
                    const message = interaction.fields.getTextInputValue('welcome_message');
                    const imageUrl = interaction.fields.getTextInputValue('welcome_image');
                    try {
                        db.updateGuildConfig(interaction.guildId, { welcome_channel: channelId || null, welcome_message: message || null, welcome_image: imageUrl || null });
                        return interaction.reply({ content: '✅ Configuración de bienvenida actualizada.', flags: [MessageFlags.Ephemeral] });
                    } catch (e) { return interaction.reply({ content: '❌ Error al guardar.', flags: [MessageFlags.Ephemeral] }); }
                }

                if (interaction.customId === 'modal_bot_setup') {
                    const channelId = interaction.fields.getTextInputValue('setup_channel');
                    const roleId = interaction.fields.getTextInputValue('setup_role');
                    const maxWarns = parseInt(interaction.fields.getTextInputValue('setup_warns')) || 3;
                    try {
                        db.updateGuildConfig(interaction.guildId, { free_games_channel: channelId || null, admin_role_id: roleId || null, max_warnings: maxWarns });
                        return interaction.reply({ content: '✅ Configuración actualizada.', flags: [MessageFlags.Ephemeral] });
                    } catch (e) { return interaction.reply({ content: '❌ Error al guardar.', flags: [MessageFlags.Ephemeral] }); }
                }
            }

            // --- MANEJAR COMANDOS SLASH ---
            if (!interaction.isChatInputCommand()) return;
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            const { cooldowns } = interaction.client;
            if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Collection());
            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply({ content: `Espera ${timeLeft.toFixed(1)}s antes de usar \`${command.data.name}\`.`, flags: [MessageFlags.Ephemeral] });
                }
            }
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            try { await command.execute(interaction); }
            catch (error) {
                logger.error(`Error en comando ${interaction.commandName}: ${error.stack}`);
                const errEmbed = new EmbedBuilder().setTitle('❌ Error').setDescription('Error interno al ejecutar el comando.').setColor(0xFF0000);
                if (interaction.replied || interaction.deferred) await interaction.followUp({ embeds: [errEmbed], flags: [MessageFlags.Ephemeral] });
                else await interaction.reply({ embeds: [errEmbed], flags: [MessageFlags.Ephemeral] });
            }
        } catch (error) {
            logger.error(`ERROR CRÍTICO en interactionCreate: ${error.stack}`);
            if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Error crítico al procesar la interacción.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    }
};
