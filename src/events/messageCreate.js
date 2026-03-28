const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const db = require('../services/DatabaseService');

// Mapas simples para anti-spam
const messageCounts = new Map();
const ANTI_SPAM_LIMIT = 5;
const ANTI_SPAM_TIME = 5000; // 5 segundos

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- ANTI-LINKS ---
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const hasLinks = urlRegex.test(message.content);

        if (hasLinks) {
            // Permitir si tiene permisos de administrador o rol de staff (configurado en DB)
            const config = db.getGuildConfig(message.guildId);
            const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
            const isStaff = config?.admin_role_id && message.member.roles.cache.has(config.admin_role_id);

            if (!isAdmin && !isStaff) {
                try {
                    await message.delete();
                    const warningEmbed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setDescription(`⚠️ **${message.author.tag}**, no tienes permiso para enviar enlaces en este servidor.`);
                    
                    const reply = await message.channel.send({ embeds: [warningEmbed] });
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                    return; // Detener flujo si se detectó link
                } catch (err) {
                    logger.error(`Error al borrar mensaje de link: ${err.message}`);
                }
            }
        }

        // --- ANTI-SPAM ---
        const authorId = message.author.id;
        const now = Date.now();
        const userData = messageCounts.get(authorId) || { count: 0, lastMessage: now };

        if (now - userData.lastMessage < ANTI_SPAM_TIME) {
            userData.count++;
        } else {
            userData.count = 1;
        }
        userData.lastMessage = now;
        messageCounts.set(authorId, userData);

        if (userData.count > ANTI_SPAM_LIMIT) {
            try {
                // Borrar los mensajes recientes si es posible
                await message.delete();
                const spamEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🚨 Anti-Spam')
                    .setDescription(`${message.author}, por favor no hagas spam.`);
                
                const reply = await message.channel.send({ embeds: [spamEmbed] });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                
                // Opcional: Podríamos auto-advertir aquí
                // db.addWarning(message.guildId, authorId, "Spam detectado automáticamente", message.client.user.id);
            } catch (err) {
                logger.error(`Error en anti-spam: ${err.message}`);
            }
        }
    },
};
