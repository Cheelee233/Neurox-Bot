const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Salta la canción actual.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) return interaction.reply({ content: 'No hay música.', flags: [MessageFlags.Ephemeral] });

        queue.node.skip();
        return interaction.reply({ content: '⏭️ Canción saltada.', flags: [MessageFlags.Ephemeral] });
    }
};
