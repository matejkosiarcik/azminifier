import winston from 'winston';

const customFormat = winston.format.printf(({ timestamp, level, message }) => {
  // Uppercaseify level
  const levelUpperCase = (() => {
    if (/^1b5b333[0-9]6d.+1b5b33396d$/.test(Buffer.from(level).toString('hex'))) {
      // Check if the level contains ANSI color escapes
      const ansiEscapeLength = 5;
      const prefix = level.slice(0, ansiEscapeLength);
      const content = level.slice(ansiEscapeLength, level.length - ansiEscapeLength).toUpperCase();
      const postfix = level.slice(level.length - ansiEscapeLength);
      return `${prefix}${content}${postfix}`;
    }
    return level.toUpperCase();
  })();

  return `${timestamp} [${levelUpperCase}]: ${(message as string).trim()}`;
});

export const log = winston.createLogger({
  level: 'none',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.cli({ level: true }),
    customFormat
  ),
  transports: [new winston.transports.Console()],
});

export async function setLogLevel(level: 'debug' | 'info' | 'error' | 'warn' | 'none') {
    log.level = level;
}
