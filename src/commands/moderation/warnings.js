const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../services/DatabaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Muestra las advertencias de un usuario.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('El usuario a consultar')
                .setRequired(true)),
    cooldown: 5,
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'No tienes permiso para consultar advertencias.', flags: [MessageFlags.Ephemeral] });
        }

        const user = interaction.options.getUser('usuario');
        const guildId = interaction.guildId;

        const warnings = db.getWarnings(guildId, user.id);

        if (warnings.length === 0) {
            return interaction.reply({ content: `✅ **${user.tag}** no tiene ninguna advertencia.`, flags: [MessageFlags.Ephemeral] });
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Advertencias de ${user.tag}`)
            .setColor(0xFFA500)
            .setDescription(warnings.map((w, i) => `**#${i+1}** - Razón: ${w.reason} (Por: <@${w.moderator_id}> en ${w.timestamp})`).join('\n'))
            .setFooter({ text: `Total: ${warnings.length} advertencias` });

        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
