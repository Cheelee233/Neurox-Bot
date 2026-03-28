const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../services/DatabaseService');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Añade una advertencia a un usuario.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('El usuario a advertir')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('razon')
                .setDescription('Razón de la advertencia')
                .setRequired(true)),
    cooldown: 5,
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'No tienes permiso para advertir usuarios.', flags: [MessageFlags.Ephemeral] });
        }

        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon');
        const guildId = interaction.guildId;
        const moderatorId = interaction.user.id;

        if (user.bot) return interaction.reply({ content: 'No puedes advertir a un bot.', flags: [MessageFlags.Ephemeral] });

        const config = db.getGuildConfig(guildId);
        const maxWarnings = config?.max_warnings || process.env.MAX_WARNINGS || 3;

        const warningCount = db.addWarning(guildId, user.id, reason, moderatorId);

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Advertencia Registrada')
            .setColor(0xFFA500)
            .addFields(
                { name: 'Usuario', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderador', value: `${interaction.user.tag}`, inline: true },
                { name: 'Advertencia #', value: `${warningCount}/${maxWarnings}`, inline: true },
                { name: 'Razón', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });

        // Sistema automático: Kick o Ban tras X advertencias
        if (warningCount >= maxWarnings) {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (member && member.kickable) {
                try {
                    await member.send(`Has sido expulsado de **${interaction.guild.name}** tras alcanzar el límite de advertencias (${maxWarnings}).`);
                    await member.kick(`Límite de advertencias alcanzado (${maxWarnings})`);
                    
                    const kickEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription(`🚨 **${user.tag}** ha sido expulsado automáticamente tras alcanzar el límite de **${maxWarnings}** advertencias.`);
                    
                    // Este mensaje sí debe ser público para que el resto del staff vea la expulsión
                    await interaction.channel.send({ embeds: [kickEmbed] });
                } catch (err) {
                    logger.error(`Error al expulsar a ${user.tag}: ${err.message}`);
                }
            }
        }
    },
};
