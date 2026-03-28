const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-hub')
        .setDescription('Despliega el Dashboard Interactivo del Bot.'),
    cooldown: 10,
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Solo los administradores pueden crear el Hub.', flags: [MessageFlags.Ephemeral] });
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Neurox • Dashboard Principal')
            .setDescription('**Bienvenido al Centro de Control de Neurox.**\n\nEste panel te permite gestionar todas las funciones del bot de forma interactiva y moderna.\n\n### 🚀 Cómo empezar:\n1. Selecciona una **categoría** en el menú desplegable.\n2. Usa los **botones dinámicos** que aparecerán para ejecutar acciones.\n3. Rellena los **formularios** si es necesario.')
            .setColor(0x2B2D31)
            .addFields(
                { name: '� Estado', value: '🟢 En Línea', inline: true },
                { name: '�️ Servidor', value: `\`${interaction.guild.name}\``, inline: true },
                { name: '🛠️ Versión', value: '`v2.0.1`', inline: true }
            )
            .setImage('https://i.imgur.com/vrqcOHB.gif')
            .setFooter({ text: 'Neurox Bot • Sistema de Gestión Avanzada', iconURL: interaction.client.user.displayAvatarURL() });

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('hub_category_select')
                    .setPlaceholder('📁 Elige una categoría...')
                    .addOptions([
                        {
                            label: 'Música',
                            description: 'Reproductor, cola y controles de audio.',
                            value: 'cat_music',
                            emoji: '🎵',
                        },
                        {
                            label: 'Juegos Gratis',
                            description: 'Ver ofertas actuales de Steam y Epic.',
                            value: 'cat_games',
                            emoji: '🎮',
                        },
                        {
                            label: 'Servidores FiveM',
                            description: 'Estado de servidores y favoritos.',
                            value: 'cat_fivem',
                            emoji: '🏎️',
                        },
                        {
                            label: 'Configuración',
                            description: 'Ajustes del bot y bienvenidas.',
                            value: 'cat_admin',
                            emoji: '⚙️',
                        },
                        {
                            label: 'Utilidades',
                            description: 'Herramientas y resumen de chats.',
                            value: 'cat_utils',
                            emoji: '🛠️',
                        },
                        {
                            label: 'Lista de Comandos',
                            description: 'Ver todos los comandos del bot.',
                            value: 'cat_help',
                            emoji: '📜',
                        },
                    ]),
            );

        await interaction.reply({ content: 'Dashboard desplegado.', flags: [MessageFlags.Ephemeral] });
        await interaction.channel.send({ embeds: [embed], components: [selectMenu] });
    },
};
