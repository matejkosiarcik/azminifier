import winston from 'winston';

const customFormat = winston.format.printf(({ message }) => {
  return `${message.trim()}`;
});

export const log = winston.createLogger({
  level: 'none',
  format: customFormat,
  transports: [new winston.transports.Console()],
});

export async function setLogLevel(level: 'debug' | 'info' | 'error' | 'warn' | 'none') {
    log.level = level;
}
