const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resumen')
        .setDescription('Genera un resumen rápido de los últimos mensajes de un canal.')
        .addChannelOption(option => 
            option.setName('canal')
                .setDescription('El canal a resumir (deja vacío para el actual)')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('cantidad')
                .setDescription('Número de mensajes a analizar (máx 50)')
                .setMinValue(5)
                .setMaxValue(50)),
    cooldown: 30,
    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad') || 30;
        const channel = interaction.options.getChannel('canal') || interaction.channel;
        
        if (!channel.isTextBased()) {
            return interaction.reply({ content: '❌ El canal seleccionado debe ser de texto.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const messages = await channel.messages.fetch({ limit: amount });
            const filtered = messages.filter(m => !m.author.bot && m.content.length > 2);

            if (filtered.size < 3) {
                return interaction.editReply('❌ No hay suficientes mensajes reales para generar un resumen.');
            }

            // --- LÓGICA DE RESUMEN BÁSICO (ANÁLISIS DE PARTICIPANTES Y TEMAS) ---
            const participants = new Map();
            let totalLength = 0;
            const keyPhrases = [];

            filtered.forEach(m => {
                // Contar mensajes por usuario
                participants.set(m.author.username, (participants.get(m.author.username) || 0) + 1);
                totalLength += m.content.length;

                // Extraer mensajes largos o con signos de exclamación como "puntos clave"
                if (m.content.length > 40 || m.content.includes('!') || m.content.includes('?')) {
                    keyPhrases.push(`**${m.author.username}**: ${m.content.substring(0, 60)}${m.content.length > 60 ? '...' : ''}`);
                }
            });

            // Ordenar participantes por actividad
            const topParticipants = [...participants.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, count]) => `${name} (${count} msgs)`)
                .join(', ');

            const embed = new EmbedBuilder()
                .setTitle('📝 Resumen del Canal (TL;DR)')
                .setDescription(`Analizados los últimos **${amount}** mensajes.`)
                .setColor(0x3498DB)
                .addFields(
                    { name: '👤 Más Activos', value: topParticipants || 'N/A', inline: false },
                    { name: '📌 Puntos Clave / Destacados', value: keyPhrases.slice(-5).reverse().join('\n') || 'No se detectaron puntos clave claros.', inline: false }
                )
                .setFooter({ text: 'Nota: Este es un resumen automático basado en actividad reciente.' });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return interaction.editReply('❌ Hubo un error al leer los mensajes.');
        }
    },
};
