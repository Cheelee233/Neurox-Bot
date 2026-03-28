const logger = require('./logger');

const errorHandler = {
    handleError(error, context = '') {
        const message = context ? `[${context}] ${error.message}` : error.message;
        logger.error(`${message}\nStack: ${error.stack}`);
    },

    handleCommandError(error, interaction) {
        this.handleError(error, `Command: ${interaction.commandName}`);
    }
};

module.exports = errorHandler;
