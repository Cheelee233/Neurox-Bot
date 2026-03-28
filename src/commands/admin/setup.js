const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../services/DatabaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configura el bot para este servidor.')
        .addChannelOption(option => 
            option.setName('canal_juegos')
                .setDescription('Canal donde se anunciarán los juegos gratuitos'))
        .addRoleOption(option => 
            option.setName('rol_admin')
                .setDescription('Rol que podrá usar comandos de moderación y saltar anti-links'))
        .addIntegerOption(option => 
            option.setName('max_advertencias')
                .setDescription('Número de advertencias antes de expulsar (Default: 3)')),
    cooldown: 10,
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'No tienes permiso para configurar el bot.', flags: [MessageFlags.Ephemeral] });
        }

        const channel = interaction.options.getChannel('canal_juegos');
        const role = interaction.options.getRole('rol_admin');
        const maxWarns = interaction.options.getInteger('max_advertencias');

        const guildId = interaction.guildId;
        const currentConfig = db.getGuildConfig(guildId) || {};

        const newConfig = {
            free_games_channel: channel ? channel.id : currentConfig.free_games_channel,
            admin_role_id: role ? role.id : currentConfig.admin_role_id,
            max_warnings: maxWarns ? maxWarns : (currentConfig.max_warnings || 3)
        };

        db.updateGuildConfig(guildId, newConfig);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuración del Servidor Actualizada')
            .setColor(0x00FF00)
            .addFields(
                { name: 'Canal de Juegos', value: channel ? `<#${channel.id}>` : (currentConfig.free_games_channel ? `<#${currentConfig.free_games_channel}>` : 'No configurado'), inline: true },
                { name: 'Rol Admin', value: role ? `<@&${role.id}>` : (currentConfig.admin_role_id ? `<@&${currentConfig.admin_role_id}>` : 'No configurado'), inline: true },
                { name: 'Máx. Advertencias', value: `${newConfig.max_warnings}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
