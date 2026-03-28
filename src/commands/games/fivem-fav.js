const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const db = require('../../services/DatabaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fivem-fav')
        .setDescription('Gestiona tus servidores FiveM favoritos.')
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('Añade un servidor a favoritos')
                .addStringOption(opt => opt.setName('ip').setDescription('IP o Código CFX').setRequired(true))
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre del servidor').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('Quita un servidor de favoritos')
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre del servidor a quitar').setRequired(true))
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'No tienes permisos.', flags: [MessageFlags.Ephemeral] });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const ip = interaction.options.getString('ip');
            const name = interaction.options.getString('nombre');
            db.addFiveMFavorite(interaction.guildId, ip, name);
            return interaction.reply({ content: `✅ Servidor **${name}** añadido a favoritos.`, flags: [MessageFlags.Ephemeral] });
        } else if (sub === 'remove') {
            const name = interaction.options.getString('nombre');
            const result = db.removeFiveMFavorite(interaction.guildId, name);
            if (result.changes > 0) {
                return interaction.reply({ content: `✅ Servidor **${name}** quitado de favoritos.`, flags: [MessageFlags.Ephemeral] });
            } else {
                return interaction.reply({ content: `❌ No se encontró el servidor con nombre **${name}**.`, flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};
