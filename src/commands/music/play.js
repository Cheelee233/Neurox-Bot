const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproduce música de YouTube o Spotify.')
        .addStringOption(option => 
            option.setName('cancion')
                .setDescription('Nombre de la canción o enlace')
                .setRequired(true)),
    cooldown: 3,
    async execute(interaction) {
        const player = useMainPlayer();
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({ content: '¡Debes estar en un canal de voz!', flags: [MessageFlags.Ephemeral] });
        }

        const query = interaction.options.getString('cancion').trim();
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const { track } = await player.play(channel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.client,
                        user: interaction.user
                    },
                    leaveOnEmpty: true,
                    leaveOnEnd: true,
                    bufferingTimeout: 15000,
                }
            });

            const embed = new EmbedBuilder()
                .setAuthor({ name: '🎵 Añadido a la cola' })
                .setDescription(`**[${track.title}](${track.url})**`)
                .setThumbnail(track.thumbnail)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Duración', value: track.duration, inline: true },
                    { name: 'Pedido por', value: interaction.user.tag, inline: true }
                );

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            console.error(e);
            return interaction.editReply(`❌ No se pudo encontrar o reproducir: **${query}**`);
        }
    },
};
