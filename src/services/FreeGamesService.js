const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const db = require('./DatabaseService');
const logger = require('../utils/logger');

class FreeGamesService {
    constructor() {
        this.cheapSharkUrl = 'https://www.cheapshark.com/api/1.0/deals?onSale=1&upperPrice=0';
        this.epicGamesUrl = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=es-ES&country=ES&allowCountries=ES';
    }

    async getCheapSharkGames() {
        try {
            const response = await axios.get(this.cheapSharkUrl);
            return response.data.map(deal => ({
                id: `cs-${deal.dealID}`,
                title: deal.title,
                platform: this.getStoreName(deal.storeID),
                originalPrice: deal.normalPrice,
                currentPrice: '0.00',
                link: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
                image: deal.thumb,
                isFree: true
            }));
        } catch (error) {
            logger.error(`Error al obtener juegos de CheapShark: ${error.message}`);
            return [];
        }
    }

    async getEpicGames() {
        try {
            const response = await axios.get(this.epicGamesUrl);
            const games = response.data.data.Catalog.searchStore.elements;
            
            return games
                .filter(game => {
                    // Solo juegos que están gratis AHORA
                    const promotions = game.promotions;
                    if (!promotions) return false;
                    const activePromos = promotions.promotionalOffers?.[0]?.promotionalOffers;
                    if (!activePromos) return false;
                    
                    const now = new Date();
                    return activePromos.some(promo => {
                        const start = new Date(promo.startDate);
                        const end = new Date(promo.endDate);
                        return now >= start && now <= end && promo.discountSetting.discountPercentage === 0;
                    });
                })
                .map(game => ({
                    id: `epic-${game.id}`,
                    title: game.title,
                    platform: 'Epic Games',
                    originalPrice: game.price.totalPrice.fmtPrice.originalPrice,
                    currentPrice: '0.00',
                    link: `https://store.epicgames.com/p/${game.catalogNs.mappings?.[0]?.pageSlug || game.productSlug}`,
                    image: game.keyImages.find(img => img.type === 'OfferImageWide')?.url || game.keyImages[0]?.url,
                    isFree: true
                }));
        } catch (error) {
            logger.error(`Error al obtener juegos de Epic Games: ${error.message}`);
            return [];
        }
    }

    getStoreName(storeID) {
        const stores = {
            '1': 'Steam',
            '2': 'GamersGate',
            '3': 'GreenManGaming',
            '7': 'GOG',
            '11': 'Humble Store',
            '25': 'Epic Games'
        };
        return stores[storeID] || 'PC Store';
    }

    async checkFreeGames(client) {
        logger.info('Iniciando chequeo de juegos gratuitos...');
        const csGames = await this.getCheapSharkGames();
        const epicGames = await this.getEpicGames();
        
        const allGames = [...csGames, ...epicGames];
        const newGames = [];

        for (const game of allGames) {
            if (!db.isGamePosted(game.id)) {
                newGames.push(game);
                db.markGameAsPosted(game.id, game.title, game.platform);
            }
        }

        if (newGames.length > 0) {
            logger.info(`Se encontraron ${newGames.length} nuevos juegos gratuitos.`);
            await this.announceGames(client, newGames);
        } else {
            logger.info('No se encontraron nuevos juegos gratuitos.');
        }
        
        return allGames;
    }

    async announceGames(client, games) {
        const config = db.getAllConfigs();
        for (const guildId in config) {
            const channelId = config[guildId].free_games_channel;
            if (!channelId) continue;

            try {
                const guild = await client.guilds.fetch(guildId);
                const channel = await guild.channels.fetch(channelId);
                if (!channel) continue;

                const embeds = games.map(game => this.createGameEmbed(game));
                await channel.send({ 
                    content: '🎮 **¡Nuevos juegos gratuitos encontrados!**', 
                    embeds 
                });
            } catch (error) {
                logger.error(`Error al anunciar juegos en guild ${guildId}: ${error.message}`);
            }
        }
    }

    createGameEmbed(game) {
        return new EmbedBuilder()
            .setTitle(`🎮 ¡JUEGO GRATIS: ${game.title}!`)
            .setURL(game.link)
            .setColor(0x00FF00)
            .addFields(
                { name: 'Plataforma', value: game.platform, inline: true },
                { name: 'Precio Original', value: `~~${game.originalPrice}~~`, inline: true },
                { name: 'Precio Actual', value: '¡GRATIS!', inline: true }
            )
            .setImage(game.image)
            .setTimestamp()
            .setFooter({ text: 'Notificaciones de Juegos Gratuitos' });
    }
}

module.exports = new FreeGamesService();
