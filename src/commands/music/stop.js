const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detiene la música y limpia la cola.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue) return interaction.reply({ content: 'No hay música.', flags: [MessageFlags.Ephemeral] });

        queue.delete();
        return interaction.reply({ content: '🛑 Música detenida y cola limpiada.', flags: [MessageFlags.Ephemeral] });
    }
};
