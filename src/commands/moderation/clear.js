const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Elimina una cantidad específica de mensajes.')
        .addIntegerOption(option => 
            option.setName('cantidad')
                .setDescription('Número de mensajes a borrar (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    cooldown: 5,
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: 'No tienes permisos para borrar mensajes.', flags: [MessageFlags.Ephemeral] });
        }

        const amount = interaction.options.getInteger('cantidad');
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            // Intentar borrado masivo (solo funciona con mensajes de menos de 14 días)
            const deleted = await interaction.channel.bulkDelete(amount, true);
            
            let totalDeleted = deleted.size;

            // Si no se borraron todos (porque son antiguos), borrar el resto uno a uno
            if (totalDeleted < amount) {
                const remaining = amount - totalDeleted;
                const messages = await interaction.channel.messages.fetch({ limit: remaining });
                
                for (const msg of messages.values()) {
                    try {
                        await msg.delete();
                        totalDeleted++;
                    } catch (err) {
                        // Ignorar errores individuales (ej. mensajes ya borrados)
                    }
                }
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(`✅ Se han eliminado **${totalDeleted}** mensajes (incluyendo mensajes antiguos).`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ content: 'Hubo un error al intentar borrar los mensajes.' });
        }
    },
};
