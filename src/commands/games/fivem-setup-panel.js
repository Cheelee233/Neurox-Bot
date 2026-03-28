const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fivem-setup-panel')
        .setDescription('Crea un panel de control para servidores FiveM.'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'No tienes permisos.', flags: [MessageFlags.Ephemeral] });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏎️ Panel de Servidores FiveM')
            .setDescription('Usa los botones de abajo para ver el estado de los servidores.')
            .setColor(0xFFD700);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_fivem_list')
                .setLabel('Actualizar Estado')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
        );

        await interaction.reply({ content: 'Panel creado.', flags: [MessageFlags.Ephemeral] });
        return interaction.channel.send({ embeds: [embed], components: [row] });
    }
};
