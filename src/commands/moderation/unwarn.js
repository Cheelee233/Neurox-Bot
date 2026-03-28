const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const db = require('../../services/DatabaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Quita una advertencia a un usuario.')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario a quitar advertencia').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'No tienes permisos para quitar advertencias.', flags: [MessageFlags.Ephemeral] });
        }

        const user = interaction.options.getUser('usuario');
        const success = db.removeWarning(interaction.guildId, user.id);

        if (success) {
            return interaction.reply({ content: `✅ Advertencia quitada a **${user.tag}**.`, flags: [MessageFlags.Ephemeral] });
        } else {
            return interaction.reply({ content: `❌ El usuario **${user.tag}** no tiene advertencias.`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
