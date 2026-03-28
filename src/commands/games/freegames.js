const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const FreeGamesService = require('../../services/FreeGamesService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('freegames')
        .setDescription('Muestra los juegos gratuitos actuales.'),
    cooldown: 10,
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            // No llamamos a checkFreeGames() para no anunciar a todos los canales, 
            // sino obtener la lista actual
            const csGames = await FreeGamesService.getCheapSharkGames();
            const epicGames = await FreeGamesService.getEpicGames();
            const allGames = [...csGames, ...epicGames];

            if (allGames.length === 0) {
                return interaction.editReply('No se han encontrado juegos gratuitos en este momento.');
            }

            const embeds = allGames.slice(0, 10).map(game => {
                return FreeGamesService.createGameEmbed(game);
            });

            await interaction.editReply({ 
                content: `Aquí tienes los **${allGames.length}** juegos gratuitos actuales:`, 
                embeds: embeds
            });
        } catch (error) {
            interaction.editReply({ content: 'Hubo un error al obtener la lista de juegos.' });
        }
    },
};
