const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Muestra la canción actual.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) return interaction.reply({ content: 'No hay música.', flags: [MessageFlags.Ephemeral] });

        const track = queue.currentTrack;
        const embed = new EmbedBuilder()
            .setTitle('🎵 Reproduciendo ahora')
            .setDescription(`**${track.title}**\nPor: ${track.author}`)
            .setThumbnail(track.thumbnail)
            .setColor(0x00AE86);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
};
