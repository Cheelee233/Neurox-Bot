const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Muestra la cola de canciones.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue) return interaction.reply({ content: 'No hay cola.', flags: [MessageFlags.Ephemeral] });

        const tracks = queue.tracks.toArray().slice(0, 10);
        const embed = new EmbedBuilder()
            .setTitle('📋 Cola de reproducción')
            .setDescription(tracks.map((t, i) => `**${i+1}.** ${t.title}`).join('\n') || 'No hay más canciones.')
            .setColor(0x00FF00);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
};
