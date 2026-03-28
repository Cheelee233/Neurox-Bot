const { EmbedBuilder } = require('discord.js');
const db = require('../services/DatabaseService');
const logger = require('../utils/logger');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        logger.info(`Nuevo miembro detectado: ${member.user.tag} en el servidor ${member.guild.name}`);
        
        const config = db.getGuildConfig(member.guild.id);
        if (!config) {
            logger.warn(`No hay configuración para el servidor ${member.guild.id}`);
            return;
        }

        if (!config.welcome_channel) {
            logger.warn(`Canal de bienvenida no configurado para el servidor ${member.guild.id}`);
            return;
        }

        const channel = member.guild.channels.cache.get(config.welcome_channel);
        if (!channel) {
            logger.error(`No se pudo encontrar el canal de bienvenida ${config.welcome_channel} en el servidor ${member.guild.id}`);
            return;
        }

        let message = config.welcome_message || '¡Bienvenido/a {user} a **{guild}**! Disfruta de tu estancia.';
        message = message.replace('{user}', `<@${member.id}>`).replace('{guild}', member.guild.name);

        const embed = new EmbedBuilder()
            .setAuthor({ name: `¡Bienvenido a ${member.guild.name}!`, iconURL: member.guild.iconURL({ dynamic: true }) })
            .setTitle(`✨ ¡Un nuevo miembro ha aparecido!`)
            .setDescription(message)
            .setColor(0x2B2D31) // Color oscuro moderno
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Usuario', value: `\`${member.user.tag}\``, inline: true },
                { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
                { name: '📅 Cuenta Creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true }
            )
            .setImage(config.welcome_image || 'https://i.imgur.com/vrqcOHB.gif') // GIF por defecto si no hay imagen
            .setTimestamp()
            .setFooter({ text: `Eres nuestro miembro #${member.guild.memberCount}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) });

        try {
            await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
        } catch (error) {
            logger.error(`Error al enviar mensaje de bienvenida en ${member.guild.name}: ${error.message}`);
        }
    },
};
